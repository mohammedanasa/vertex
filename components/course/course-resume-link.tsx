"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS, type ResumeSource } from "@/lib/analytics/events";

/**
 * A "pick this course back up" link that reports the resume.
 *
 * Resume intent, not resume state: there is no progress backend yet
 * (AGENTS.md §7), so the destination is the course's first lesson rather than a
 * stored position. The event says which affordance was used, so once real
 * progress exists the same funnel keeps working.
 *
 * Only this handler ships to the browser; the surrounding component stays a
 * server component.
 */
export function CourseResumeLink({
  href,
  source,
  courseSlug,
  lessonSlug,
  className,
  children,
}: {
  href: string;
  source: ResumeSource;
  courseSlug: string;
  lessonSlug: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        posthog.capture(ANALYTICS_EVENTS.RESUME_USED, {
          source,
          course_slug: courseSlug,
          lesson_slug: lessonSlug,
          start_seconds: null,
        })
      }
    >
      {children}
    </Link>
  );
}
