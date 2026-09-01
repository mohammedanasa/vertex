"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ArrowRightIcon, CheckCircleIcon } from "@/components/icons";
import { formatDuration } from "@/lib/format";

export interface NextLessonTarget {
  slug: string;
  title: string | null;
  duration: number | null;
}

/** Seconds the learner has to cancel before the next lesson opens. */
const COUNTDOWN_SECONDS = 5;

/**
 * Shown over the player when a lesson's video ends.
 *
 * Two shapes: a countdown to the next lesson, or — on the final lesson, where
 * `next` is null — a course-complete panel with no countdown, so the course
 * ends with an acknowledgement rather than a timer pointing nowhere.
 *
 * ## Why the countdown can be stopped
 *
 * The notes, key points, and resources all sit below the player. A learner who
 * finishes the video and keeps reading must not be yanked to the next lesson,
 * so Cancel stops the countdown permanently for this lesson, and switching tabs
 * pauses it rather than advancing behind their back.
 */
export function LessonAutoAdvanceOverlay({
  next,
  courseSlug,
  onAdvance,
  onCancel,
  onDismiss,
}: {
  next: NextLessonTarget | null;
  courseSlug: string | null;
  /** Navigates to the next lesson. Awaited, so a pending write can finish. */
  onAdvance: (trigger: "countdown_expired" | "play_now_clicked") => void;
  onCancel: () => void;
  /** Closes the overlay without navigating. */
  onDismiss: () => void;
}) {
  const [remaining, setRemaining] = useState(COUNTDOWN_SECONDS);
  const [cancelled, setCancelled] = useState(false);
  const advanced = useRef(false);

  function cancel() {
    setCancelled(true);
    onCancel();
  }

  // The countdown. Paused while the tab is hidden so a learner who switches
  // away does not come back several lessons along.
  useEffect(() => {
    if (!next || cancelled) return;

    const tick = setInterval(() => {
      if (document.hidden) return;
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(tick);
  }, [next, cancelled]);

  // Navigate in its own effect, so the tick above stays a pure state update
  // and cannot fire the navigation twice.
  useEffect(() => {
    if (!next || cancelled || remaining > 0 || advanced.current) return;
    advanced.current = true;
    onAdvance("countdown_expired");
  }, [next, cancelled, remaining, onAdvance]);

  // Escape dismisses, matching the actions menu on My Learning.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      cancel();
      onDismiss();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shell =
    "absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-neutral-900/90 p-6 text-center";

  if (!next) {
    return (
      <div className={shell} role="dialog" aria-label="Course complete">
        <CheckCircleIcon className="size-10 text-success-500" />
        <p className="font-display text-heading-2 font-bold text-white">
          You finished this course
        </p>
        <p className="max-w-sm text-body-lg text-neutral-300">
          That was the last lesson. Nice work.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={courseSlug ? `/courses/${courseSlug}` : "/courses"}
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white hover:bg-primary-600"
          >
            Back to course
          </Link>
          <Link
            href="/my-learning"
            className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-body-lg font-medium text-white hover:bg-white/10"
          >
            My Learning
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={shell} role="dialog" aria-label="Next lesson">
      <p className="text-small font-semibold tracking-wider text-neutral-300 uppercase">
        Up next
      </p>
      <p className="max-w-md font-display text-heading-2 font-bold text-white">
        {next.title}
      </p>
      {next.duration ? (
        <p className="text-body text-neutral-300">
          {formatDuration(next.duration)}
        </p>
      ) : null}

      {/*
        aria-live so a screen reader hears the countdown, but "polite" and only
        on the number — announcing every second assertively would be hostile.
      */}
      {!cancelled ? (
        <p className="text-body-lg text-neutral-300" aria-live="polite">
          Starting in <span className="font-semibold text-white">{remaining}</span>
        </p>
      ) : (
        <p className="text-body-lg text-neutral-300">Autoplay off</p>
      )}

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (advanced.current) return;
            advanced.current = true;
            onAdvance("play_now_clicked");
          }}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white hover:bg-primary-600"
        >
          Play now
          <ArrowRightIcon className="size-5" />
        </button>
        {!cancelled ? (
          <button
            type="button"
            onClick={cancel}
            className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-body-lg font-medium text-white hover:bg-white/10"
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-11 items-center justify-center rounded-md border border-neutral-300 px-4 text-body-lg font-medium text-white hover:bg-white/10"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
