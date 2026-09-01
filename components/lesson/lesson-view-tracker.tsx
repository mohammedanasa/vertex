"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * Fires a single `lesson_viewed` event when the lesson page mounts, matching
 * the pattern already used by `course-view-tracker.tsx`, and enrols the learner
 * in the course.
 *
 * ## Why enrollment happens here
 *
 * Opening a lesson is the clearest signal a learner is taking a course, and
 * before this existed the only way onto My Learning was watching a lesson to
 * 90% — so someone could click Continue Learning, read half a lesson, and never
 * see the course listed.
 *
 * The write lives in this client effect rather than in the page's server render
 * because a Server Component must not perform side-effecting writes while
 * rendering: it would re-run on retries and prefetches. This mirrors how
 * `lesson-video.tsx` already persists completion — one route, one pattern.
 *
 * Fire-and-forget: a failed enrollment must never disturb the page. It is
 * idempotent server-side, so the repeat on a remount costs nothing.
 *
 * `courseId` is null when signed out, so the client never attempts a write it
 * cannot authorize.
 */
export function LessonViewTracker({
  lessonSlug,
  courseSlug,
  courseId,
  lessonLabel,
  durationSeconds,
}: {
  lessonSlug: string;
  courseSlug: string | null;
  /** Sanity course id, or null when signed out. */
  courseId: string | null;
  lessonLabel: string | null;
  durationSeconds: number | null;
}) {
  useEffect(() => {
    posthog.capture("lesson_viewed", {
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      lesson_label: lessonLabel,
      lesson_duration_seconds: durationSeconds,
    });

    if (!courseId) return;

    void fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enroll-course", courseId }),
    })
      .then((response) => {
        // Only report an enrollment the server actually accepted.
        if (!response.ok) return;
        posthog.capture(ANALYTICS_EVENTS.COURSE_ENROLLED, {
          source: "lesson_opened",
          course_slug: courseSlug,
          course_title: null,
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSlug, courseId]);

  return null;
}
