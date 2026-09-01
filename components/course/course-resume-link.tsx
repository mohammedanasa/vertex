"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS, type ResumeSource } from "@/lib/analytics/events";

/**
 * A "pick this course back up" link that reports the resume.
 *
 * The caller resolves the destination from stored progress — the first lesson
 * the learner has not completed — so this resumes at a real position rather
 * than always at the top. It still resumes to a *lesson*, not to a timestamp
 * within one; `lastPositions` is recorded but nothing seeks to it yet.
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
