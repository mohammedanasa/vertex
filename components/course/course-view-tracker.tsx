"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface CourseViewTrackerProps {
  courseSlug: string;
  courseTitle: string | null;
  courseLevel: string | null;
}

/**
 * Fires a single `course_viewed` event when the course detail page mounts.
 * This is a legitimate use of useEffect: it synchronizes a one-time side-effect
 * (analytics capture) with the external PostHog system after the page renders.
 */
export function CourseViewTracker({
  courseSlug,
  courseTitle,
  courseLevel,
}: CourseViewTrackerProps) {
  useEffect(() => {
    posthog.capture("course_viewed", {
      course_slug: courseSlug,
      course_title: courseTitle,
      course_level: courseLevel,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSlug]);

  return null;
}
