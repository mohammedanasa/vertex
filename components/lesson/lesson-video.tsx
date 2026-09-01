"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import posthog from "posthog-js";
import { PlayCircleFilledIcon } from "@/components/icons";
import {
  ANALYTICS_EVENTS,
  COMPLETION_MILESTONE,
  WATCH_DEPTH_MILESTONES,
} from "@/lib/analytics/events";
import { buildYouTubeEmbedUrl, formatTimestamp } from "@/lib/video";

interface LessonVideoProps {
  videoId: string | null;
  posterUrl: string | null;
  title: string;
  startSeconds: number;
  lessonSlug: string;
  courseSlug: string | null;
  lessonLabel: string | null;
  durationSeconds: number | null;
}

/** How often the wall-clock estimate is re-checked, in ms. */
const TICK_MS = 5000;

/**
 * Least of the lesson a learner must actually sit through before it can count
 * as completed, as a fraction of its duration.
 *
 * Guards the deep-link case: a search result that drops someone at 95% is
 * already past the completion threshold on the first tick, and without this
 * they would be counted as finishing a lesson they only opened.
 */
const MIN_WATCHED_FRACTION_FOR_COMPLETION = 0.1;

/**
 * Playback stays on the site through YouTube's own embed (AGENTS.md §7) — no
 * custom player, and no link out to youtube.com.
 *
 * The poster is a click-to-play surface rather than an iframe mounted on load:
 * that keeps the 120 lesson pages from each pulling YouTube's player on mount,
 * and it makes the play a real user gesture so autoplay is allowed. A start
 * offset in the URL (a search result linking to a moment) skips the poster and
 * mounts the player already seeked.
 *
 * ## Watch depth is an estimate, not a measurement
 *
 * The embed is a plain iframe with no `enablejsapi`, so there is no way to read
 * the player's real position. Depth is therefore approximated from wall-clock
 * time elapsed since play, measured against the lesson's authored duration.
 *
 * That means it counts time the learner spent paused, scrubbed backwards, or on
 * another tab, so it *overstates* how much was actually watched. Every event it
 * produces says so — the property is `approx_percent_watched` and completion
 * carries `is_estimate: true` — so nobody reads these numbers as exact. Swapping
 * in the YouTube IFrame Player API would make them real.
 */
export function LessonVideo({
  videoId,
  posterUrl,
  title,
  startSeconds,
  lessonSlug,
  courseSlug,
  lessonLabel,
  durationSeconds,
}: LessonVideoProps) {
  const [isPlaying, setIsPlaying] = useState(startSeconds > 0);

  // Milestones already sent this mount, so each fires at most once even though
  // the timer keeps running past the threshold.
  const firedMilestones = useRef<Set<number>>(new Set());
  const firedCompletion = useRef(false);
  const playStartedAt = useRef<number | null>(null);

  // A deep link to 5:00 of a 6:00 video starts the learner at 83%, not 0 — the
  // offset is the baseline, otherwise every search result would look unwatched.
  const baseSeconds = startSeconds > 0 ? startSeconds : 0;
  const hasDuration = typeof durationSeconds === "number" && durationSeconds > 0;

  /**
   * Starts the clock, and writes off the milestones the start offset already
   * skipped past.
   *
   * Without that second part a search result linking to 9:10 of a 10:00 lesson
   * would fire 25, 50, 75, 90 *and* `lesson_completed` on the first tick, after
   * five seconds of watching — the learner would be counted as having finished
   * a lesson they just opened. Seeding them as already-fired means only
   * milestones genuinely crossed while watching are reported.
   */
  function beginWatchTracking() {
    playStartedAt.current = Date.now();

    if (!hasDuration) return;
    const startPercent = (baseSeconds / durationSeconds) * 100;
    for (const milestone of WATCH_DEPTH_MILESTONES) {
      if (startPercent >= milestone) firedMilestones.current.add(milestone);
    }
  }

  // A video that mounts already playing (a search deep link) never passes
  // through `play()`, so the clock has to start here too.
  useEffect(() => {
    if (isPlaying && playStartedAt.current === null) {
      beginWatchTracking();
    }
    // Runs once per playback start; `beginWatchTracking` only reads props that
    // are fixed for the lifetime of a given lesson render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  /**
   * The watch-depth timer.
   *
   * A genuine external-system synchronization: an interval that has to be torn
   * down on unmount, which is exactly what an effect is for. It is not reacting
   * to a state change to derive a value — the play event itself is captured in
   * the click handler below.
   */
  useEffect(() => {
    // With no authored duration there is nothing to take a percentage of, so
    // depth is skipped entirely rather than guessed at.
    if (!isPlaying || !hasDuration) return;

    const interval = setInterval(() => {
      if (playStartedAt.current === null) return;

      const elapsed = (Date.now() - playStartedAt.current) / 1000;
      const watched = baseSeconds + elapsed;
      const percent = (watched / durationSeconds) * 100;

      for (const milestone of WATCH_DEPTH_MILESTONES) {
        if (percent < milestone || firedMilestones.current.has(milestone)) {
          continue;
        }
        firedMilestones.current.add(milestone);

        posthog.capture(ANALYTICS_EVENTS.VIDEO_PLAYBACK_PROGRESSED, {
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          lesson_label: lessonLabel,
          approx_percent_watched: milestone,
          approx_seconds_watched: Math.round(watched),
          video_duration_seconds: durationSeconds,
          start_seconds: startSeconds,
          is_estimate: true,
        });
      }

      /**
       * Completion is judged on the position reached, not on the milestone
       * list, because the two answer different questions.
       *
       * A learner who follows a search result to 9:10 of a 10:00 lesson and
       * watches to the end has finished it, but every depth milestone was
       * already behind them at the start, so a completion tied to the 90
       * milestone would never fire. Tracking it separately means entering late
       * and watching to the end still counts, while the minimum-watched guard
       * keeps someone who opens at 95% and leaves from counting as finished.
       */
      const watchedEnough =
        elapsed >= durationSeconds * MIN_WATCHED_FRACTION_FOR_COMPLETION;

      if (
        !firedCompletion.current &&
        percent >= COMPLETION_MILESTONE &&
        watchedEnough
      ) {
        firedCompletion.current = true;

        posthog.capture(ANALYTICS_EVENTS.LESSON_COMPLETED, {
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          lesson_label: lessonLabel,
          video_duration_seconds: durationSeconds,
          approx_seconds_watched: Math.round(watched),
          start_seconds: startSeconds,
          completion_source: "video_watch_estimate",
          is_estimate: true,
        });
      }
    }, TICK_MS);

    // Cleared on unmount so a client navigation away mid-playback does not
    // leave an interval firing against a dead component.
    return () => clearInterval(interval);
  }, [
    isPlaying,
    hasDuration,
    durationSeconds,
    baseSeconds,
    startSeconds,
    lessonSlug,
    courseSlug,
    lessonLabel,
  ]);

  function play() {
    setIsPlaying(true);
    beginWatchTracking();

    posthog.capture(ANALYTICS_EVENTS.VIDEO_PLAYED, {
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      lesson_label: lessonLabel,
      start_seconds: startSeconds,
      video_duration_seconds: durationSeconds,
      // A play that begins at an offset came from a search moment link, which
      // separates "found it via search" from "started at the top".
      resumed_from_search: startSeconds > 0,
    });
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
      {isPlaying && videoId ? (
        <iframe
          src={buildYouTubeEmbedUrl(videoId, { startSeconds, autoplay: true })}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <>
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 700px, 100vw"
              className="object-cover"
              priority
            />
          ) : null}

          {videoId ? (
            <button
              type="button"
              onClick={play}
              aria-label={
                startSeconds > 0
                  ? `Play ${title} from ${formatTimestamp(startSeconds)}`
                  : `Play ${title}`
              }
              className="group absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-colors hover:bg-neutral-900/45"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform group-hover:scale-105">
                <PlayCircleFilledIcon className="size-9" />
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 px-6 text-center">
              <p className="text-body text-white">
                This lesson&rsquo;s video is unavailable.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
