"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

/**
 * A Previous/Next control that reports the move.
 *
 * Sequential progression through a course is the clearest engagement signal the
 * app has while there is no progress backend, so it is worth its own event.
 *
 * Only this handler crosses into the browser bundle; `LessonNav` itself stays a
 * server component.
 */
export function LessonNavLink({
  href,
  direction,
  fromLessonSlug,
  toLessonSlug,
  courseSlug,
  className,
  children,
}: {
  href: string;
  direction: "previous" | "next";
  fromLessonSlug: string;
  toLessonSlug: string;
  courseSlug: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        posthog.capture(ANALYTICS_EVENTS.LESSON_NAVIGATED, {
          direction,
          from_lesson_slug: fromLessonSlug,
          to_lesson_slug: toLessonSlug,
          course_slug: courseSlug,
        })
      }
    >
      {children}
    </Link>
  );
}
