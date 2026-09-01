"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { PlayCircleFilledIcon } from "@/components/icons";
import {
  LessonAutoAdvanceOverlay,
  type NextLessonTarget,
} from "@/components/lesson/lesson-autoadvance-overlay";
import {
  ANALYTICS_EVENTS,
  COMPLETION_MILESTONE,
  WATCH_DEPTH_MILESTONES,
  type AutoAdvanceTrigger,
} from "@/lib/analytics/events";
import { buildYouTubeEmbedUrl, formatTimestamp, youTubePlayerVars } from "@/lib/video";
import {
  loadYouTubeApi,
  YT_STATE,
  type YouTubePlayer,
} from "@/lib/youtube-player";

interface LessonVideoProps {
  videoId: string | null;
  posterUrl: string | null;
  title: string;
  startSeconds: number;
  /**
   * Start playing without waiting for a click.
   *
   * Set by auto-advance, so finishing one lesson rolls straight into the next
   * rather than landing on a poster the learner has to click. Distinct from
   * `startSeconds > 0`, which also autoplays but means "seek to this moment".
   */
  autoplay?: boolean;
  lessonSlug: string;
  courseSlug: string | null;
  lessonLabel: string | null;
  durationSeconds: number | null;
  /** Document ids for persisting completion; null when signed out. */
  lessonId: string | null;
  courseId: string | null;
  /** Where auto-advance goes. Null on the last lesson of a course. */
  nextLesson: NextLessonTarget | null;
}

/** How often playback position is sampled, in ms. */
const TICK_MS = 2000;

/**
 * Least of the video a learner must actually watch before it can count as
 * completed, as a fraction of its duration.
 *
 * Guards the deep-link case: a search result that drops someone at 95% is
 * already past the completion threshold on the first tick, and without this
 * they would be counted as finishing a lesson they only opened. Measured in
 * *player time advanced*, not wall-clock, so pausing does not accrue credit.
 */
const MIN_WATCHED_FRACTION_FOR_COMPLETION = 0.1;

/** Least gap between position writes, so a long lesson does not hammer the route. */
const POSITION_WRITE_INTERVAL_MS = 15000;

/**
 * Playback stays on the site through YouTube's own embed (AGENTS.md §7) — no
 * custom player, and no link out to youtube.com.
 *
 * The poster is a click-to-play surface rather than a player mounted on load:
 * that keeps the 120 lesson pages from each pulling YouTube's player on mount,
 * and it makes the play a real user gesture so autoplay is allowed. A start
 * offset in the URL (a search result linking to a moment) skips the poster and
 * mounts the player already seeked.
 *
 * ## Watch depth is measured, not estimated
 *
 * The player is driven through the YouTube IFrame Player API, so depth comes
 * from `getCurrentTime()` — the learner's real position.
 *
 * It did not used to. Depth was previously derived from wall-clock time since
 * the play click, which meant an 8-minute lesson only registered as complete
 * after ~7m12s of tab-open time: watching the video normally never counted, and
 * a reported "I completed the video but progress shows 0%" was the result. The
 * estimate also accrued credit while paused or backgrounded.
 *
 * If the API cannot load — blocked script, offline — this falls back to a plain
 * iframe and the old estimate. Tracking degrades; playback does not break.
 */
export function LessonVideo({
  videoId,
  posterUrl,
  title,
  startSeconds,
  autoplay = false,
  lessonSlug,
  courseSlug,
  lessonLabel,
  durationSeconds,
  lessonId,
  courseId,
  nextLesson,
}: LessonVideoProps) {
  const [isPlaying, setIsPlaying] = useState(startSeconds > 0 || autoplay);
  const [ended, setEnded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  /** Set when the browser refused to autoplay, so the poster comes back. */
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const router = useRouter();

  // Milestones already sent this mount, so each fires at most once even though
  // the sampler keeps running past the threshold.
  const firedMilestones = useRef<Set<number>>(new Set());
  const firedCompletion = useRef(false);
  /** The in-flight completion write, so navigation can await it. */
  const completionWrite = useRef<Promise<unknown> | null>(null);

  // Real seconds of video the learner has advanced through, and the last
  // position seen — the difference is what counts as watched.
  const watchedSeconds = useRef(0);
  const lastPosition = useRef(startSeconds > 0 ? startSeconds : 0);
  const lastPositionWrite = useRef(0);
  /** Wall-clock start, used only by the no-API fallback. */
  const playStartedAt = useRef<number | null>(null);

  const baseSeconds = startSeconds > 0 ? startSeconds : 0;
  const hasDuration = typeof durationSeconds === "number" && durationSeconds > 0;
  const canWrite = Boolean(lessonId && courseId);

  /**
   * Writes off the milestones a start offset already skipped past.
   *
   * Without this a search result linking to 9:10 of a 10:00 lesson would fire
   * 25, 50, 75, 90 *and* `lesson_completed` on the first sample — the learner
   * counted as having finished a lesson they just opened.
   */
  const seedSkippedMilestones = useCallback(
    (duration: number) => {
      if (duration <= 0) return;
      const startPercent = (baseSeconds / duration) * 100;
      for (const milestone of WATCH_DEPTH_MILESTONES) {
        if (startPercent >= milestone) firedMilestones.current.add(milestone);
      }
    },
    [baseSeconds],
  );

  /** Persists the learner's position. Fire-and-forget; never blocks playback. */
  const savePosition = useCallback(
    (seconds: number, { force = false }: { force?: boolean } = {}) => {
      if (!canWrite || seconds <= 0) return;

      const now = Date.now();
      if (!force && now - lastPositionWrite.current < POSITION_WRITE_INTERVAL_MS) {
        return;
      }
      lastPositionWrite.current = now;

      const body = JSON.stringify({
        action: "save-position",
        courseId,
        lessonId,
        seconds: Math.floor(seconds),
      });

      // On the way out the page may be torn down before fetch resolves, so use
      // sendBeacon there — it is the one transport the browser promises to
      // finish. This is why `lastPositions` used to come back empty.
      if (force && typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/progress",
          new Blob([body], { type: "application/json" }),
        );
        return;
      }

      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    },
    [canWrite, courseId, lessonId],
  );

  /** Records the completion, once, and keeps the promise so navigation can wait. */
  const completeLesson = useCallback(
    (positionSeconds: number, duration: number) => {
      if (firedCompletion.current) return;
      firedCompletion.current = true;

      posthog.capture(ANALYTICS_EVENTS.LESSON_COMPLETED, {
        lesson_slug: lessonSlug,
        course_slug: courseSlug,
        lesson_label: lessonLabel,
        video_duration_seconds: duration || durationSeconds,
        seconds_watched: Math.round(watchedSeconds.current),
        start_seconds: startSeconds,
        completion_source: useFallback ? "wall_clock_estimate" : "player_position",
      });

      if (!canWrite) return;

      completionWrite.current = fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete-lesson",
          courseId,
          lessonId,
          seconds: Math.floor(positionSeconds),
        }),
        keepalive: true,
      })
        .then((response) => {
          // Repaint the sidebar's percentage and check marks. Without this even
          // a successful write left the page showing the old state.
          if (response.ok) router.refresh();
        })
        .catch(() => {});
    },
    [
      canWrite,
      courseId,
      courseSlug,
      durationSeconds,
      lessonId,
      lessonLabel,
      lessonSlug,
      router,
      startSeconds,
      useFallback,
    ],
  );

  /** Evaluates depth at a real position. Shared by the API and fallback paths. */
  const sample = useCallback(
    (position: number, duration: number) => {
      if (duration <= 0) return;

      // Only forward movement counts, so scrubbing backwards and re-watching
      // does not inflate the total.
      const delta = position - lastPosition.current;
      if (delta > 0 && delta < 30) watchedSeconds.current += delta;
      lastPosition.current = position;

      const percent = (position / duration) * 100;

      for (const milestone of WATCH_DEPTH_MILESTONES) {
        if (percent < milestone || firedMilestones.current.has(milestone)) continue;
        firedMilestones.current.add(milestone);

        posthog.capture(ANALYTICS_EVENTS.VIDEO_PLAYBACK_PROGRESSED, {
          lesson_slug: lessonSlug,
          course_slug: courseSlug,
          lesson_label: lessonLabel,
          percent_watched: milestone,
          seconds_watched: Math.round(watchedSeconds.current),
          video_duration_seconds: duration,
          start_seconds: startSeconds,
        });
      }

      savePosition(position);

      const watchedEnough =
        watchedSeconds.current >= duration * MIN_WATCHED_FRACTION_FOR_COMPLETION;

      if (percent >= COMPLETION_MILESTONE && watchedEnough) {
        completeLesson(position, duration);
      }
    },
    [completeLesson, courseSlug, lessonLabel, lessonSlug, savePosition, startSeconds],
  );

  /** Ending is unconditional completion — there is no more video to watch. */
  const handleEnded = useCallback(
    (duration: number) => {
      completeLesson(duration, duration);
      setEnded(true);
    },
    [completeLesson],
  );

  // Build the real player once the learner has started.
  useEffect(() => {
    if (!isPlaying || !videoId || useFallback || autoplayBlocked) return;
    if (!mountRef.current) return;

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let autoplayCheck: ReturnType<typeof setTimeout> | undefined;

    /**
     * A throwaway node for the API to consume.
     *
     * `new YT.Player(el)` does not render *into* the element — it **replaces**
     * it with an iframe. Handing it a React-rendered node desynchronises
     * React's tree from the DOM, and the next unmount of that branch throws
     * "Failed to execute 'removeChild': The node to be removed is not a child
     * of this node".
     *
     * So React owns the wrapper below and never sees this child: we create it,
     * the API destroys it, and cleanup empties the wrapper directly.
     */
    // Captured now: by cleanup time `mountRef.current` may already point
    // elsewhere, and we must empty the wrapper this effect actually filled.
    const wrapper = mountRef.current;

    const host = document.createElement("div");
    host.className = "size-full";
    wrapper.replaceChildren(host);

    loadYouTubeApi()
      .then((YT) => {
        // `host` may already be detached if cleanup ran while the API loaded.
        if (cancelled || !host.isConnected) return;

        playerRef.current = new YT.Player(host, {
          videoId,
          playerVars: youTubePlayerVars({
            startSeconds,
            origin: window.location.origin,
          }),
          events: {
            onReady: (event) => {
              if (cancelled) return;
              event.target.playVideo();
              seedSkippedMilestones(event.target.getDuration());

              /**
               * Browsers block autoplay with sound without a recent user
               * gesture. Clicking "Play now" counts; a countdown that simply
               * expired may not, so the next lesson could land paused on a
               * blank frame.
               *
               * Only `UNSTARTED` and `CUED` mean "refused". A player that is
               * BUFFERING is working — it just has not painted a frame yet,
               * which is also what a forward seek looks like. Treating those as
               * a refusal tore the player down mid-playback.
               *
               * Only relevant when nothing has played yet, so this never fires
               * for a learner who is already watching.
               */
              autoplayCheck = setTimeout(() => {
                const player = playerRef.current;
                if (cancelled || !player) return;
                if (watchedSeconds.current > 0) return;

                const state = player.getPlayerState();
                if (state === YT_STATE.UNSTARTED || state === YT_STATE.CUED) {
                  setAutoplayBlocked(true);
                }
              }, 2000);

              interval = setInterval(() => {
                const player = playerRef.current;
                if (!player) return;
                if (player.getPlayerState() !== YT_STATE.PLAYING) return;
                sample(player.getCurrentTime(), player.getDuration());
              }, TICK_MS);
            },
            onStateChange: (event) => {
              if (cancelled) return;
              const player = event.target;

              if (event.data === YT_STATE.ENDED) {
                handleEnded(player.getDuration());
              } else if (event.data === YT_STATE.PAUSED) {
                // Pausing is a likely prelude to leaving; checkpoint now.
                savePosition(player.getCurrentTime(), { force: true });
              }
            },
            onError: () => {
              // Only swap to the fallback before anything has played. Doing it
              // mid-watch would replace the player branch and restart the
              // video from the top, which is worse than the error itself.
              if (cancelled || watchedSeconds.current > 0) return;
              setUseFallback(true);
            },
          },
        });
      })
      .catch(() => {
        // Script blocked or offline. Fall back to the plain iframe so the
        // learner can still watch; tracking degrades to the old estimate.
        if (!cancelled) setUseFallback(true);
      });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (autoplayCheck) clearTimeout(autoplayCheck);

      const player = playerRef.current;
      if (player) {
        try {
          savePosition(player.getCurrentTime(), { force: true });
          player.destroy();
        } catch {
          // The iframe may already be gone during a fast navigation.
        }
        playerRef.current = null;
      }

      // Empty the wrapper ourselves. `destroy()` does not reliably remove the
      // iframe it swapped in, and React must find the wrapper empty — it never
      // knew about anything inside it.
      try {
        wrapper.replaceChildren();
      } catch {
        // Wrapper already detached; nothing to clean.
      }
    };
  }, [
    isPlaying,
    videoId,
    useFallback,
    autoplayBlocked,
    startSeconds,
    sample,
    handleEnded,
    savePosition,
    seedSkippedMilestones,
  ]);

  // Checkpoint the position when the page goes away. `pagehide` fires on
  // bfcache navigations and tab closes where `beforeunload` may not.
  useEffect(() => {
    if (!isPlaying) return;

    function checkpoint() {
      const player = playerRef.current;
      if (!player) return;
      try {
        savePosition(player.getCurrentTime(), { force: true });
      } catch {
        // Player already torn down; nothing to save.
      }
    }

    window.addEventListener("pagehide", checkpoint);
    document.addEventListener("visibilitychange", checkpoint);
    return () => {
      window.removeEventListener("pagehide", checkpoint);
      document.removeEventListener("visibilitychange", checkpoint);
    };
  }, [isPlaying, savePosition]);

  // The wall-clock fallback, used only when the API could not load.
  useEffect(() => {
    if (!useFallback || !isPlaying || !hasDuration) return;

    if (playStartedAt.current === null) {
      playStartedAt.current = Date.now();
      seedSkippedMilestones(durationSeconds);
    }

    const interval = setInterval(() => {
      if (playStartedAt.current === null) return;
      const elapsed = (Date.now() - playStartedAt.current) / 1000;
      sample(baseSeconds + elapsed, durationSeconds);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [
    useFallback,
    isPlaying,
    hasDuration,
    durationSeconds,
    baseSeconds,
    sample,
    seedSkippedMilestones,
  ]);

  /**
   * Navigates to the next lesson.
   *
   * Awaits the completion write first. Without that the navigation can cancel
   * an in-flight request and the lesson the learner just finished would stay
   * unmarked — reintroducing exactly the bug auto-advance sits on top of.
   */
  async function advance(trigger: AutoAdvanceTrigger) {
    posthog.capture(ANALYTICS_EVENTS.LESSON_AUTO_ADVANCED, {
      trigger,
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      next_lesson_slug: nextLesson?.slug ?? null,
    });

    try {
      await completionWrite.current;
    } catch {
      // A failed completion should not strand the learner on a finished video.
    }

    // `autoplay=1` so the next lesson starts on its own — landing on a poster
    // that needs a click would defeat the point of advancing automatically.
    if (nextLesson) router.push(`/lessons/${nextLesson.slug}?autoplay=1`);
  }

  function play() {
    // This click is the user gesture autoplay was missing, so let the player
    // mount again rather than staying on the poster.
    setAutoplayBlocked(false);
    setIsPlaying(true);

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
      {isPlaying && videoId && !autoplayBlocked ? (
        useFallback ? (
          <iframe
            key="yt-fallback"
            src={buildYouTubeEmbedUrl(videoId, { startSeconds, autoplay: true })}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          /*
           * A stable wrapper React owns and never puts children into. The
           * effect above creates a throwaway node inside it for the API to
           * replace, so React's tree and the real DOM never disagree.
           *
           * `key` forces a genuine remount when swapping to the fallback
           * iframe, instead of React reusing this element for a different tag.
           */
          <div
            key="yt-player"
            ref={mountRef}
            className="absolute inset-0 size-full"
          />
        )
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

      {ended ? (
        <LessonAutoAdvanceOverlay
          next={nextLesson}
          courseSlug={courseSlug}
          onAdvance={advance}
          onCancel={() =>
            posthog.capture(ANALYTICS_EVENTS.LESSON_AUTO_ADVANCE_CANCELLED, {
              lesson_slug: lessonSlug,
              course_slug: courseSlug,
            })
          }
          onDismiss={() => setEnded(false)}
        />
      ) : null}
    </div>
  );
}
