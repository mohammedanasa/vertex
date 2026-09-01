"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface MyLearningViewTrackerProps {
  /** How many started courses the learner has, in total — before filtering. */
  courseCount: number;
  /** How many the current filter left on screen. */
  visibleCount: number;
  /** The active status filter, so an empty filtered view is distinguishable. */
  status: string;
}

/**
 * Fires a single `my_learning_viewed` event when the page mounts.
 *
 * Same shape as `components/course/course-view-tracker.tsx`: a one-time
 * side-effect synchronizing with PostHog after render, which keeps the page
 * itself a server component.
 *
 * No Clerk user id in the payload — PostHog already carries it as the distinct
 * id (see the header comment in `lib/analytics/events.ts`).
 */
export function MyLearningViewTracker({
  courseCount,
  visibleCount,
  status,
}: MyLearningViewTrackerProps) {
  useEffect(() => {
    posthog.capture(ANALYTICS_EVENTS.MY_LEARNING_VIEWED, {
      course_count: courseCount,
      visible_count: visibleCount,
      status_filter: status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return null;
}
