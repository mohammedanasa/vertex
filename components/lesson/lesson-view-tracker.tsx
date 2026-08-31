"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Fires a single `lesson_viewed` event when the lesson page mounts, matching
 * the pattern already used by `course-view-tracker.tsx`.
 */
export function LessonViewTracker({
  lessonSlug,
  courseSlug,
  lessonLabel,
  durationSeconds,
}: {
  lessonSlug: string;
  courseSlug: string | null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonSlug]);

  return null;
}
