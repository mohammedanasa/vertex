"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { BookmarkIcon } from "@/components/icons";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface CourseCTAButtonsProps {
  continueHref: string;
  courseSlug: string;
  courseTitle: string | null;
  /** The lesson the Continue control resumes into, for the resume event. */
  continueLessonSlug: string | null;
}

export function CourseCTAButtons({
  continueHref,
  courseSlug,
  courseTitle,
  continueLessonSlug,
}: CourseCTAButtonsProps) {
  /**
   * Continue Learning is both a CTA click and a resume. The two are captured
   * separately because they answer different questions — one is about this
   * button, the other about resume behaviour across every surface that offers
   * it — and a single event cannot serve both funnels.
   *
   * This is resume *intent*: there is no progress backend yet (AGENTS.md §7),
   * so the destination is the course's first lesson, not a stored position.
   */
  function continueLearning() {
    posthog.capture(ANALYTICS_EVENTS.RESUME_USED, {
      source: "course_cta",
      course_slug: courseSlug,
      lesson_slug: continueLessonSlug,
      start_seconds: null,
    });
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link
        href={continueHref}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
        onClick={() => {
          posthog.capture("course_continue_learning_clicked", {
            course_slug: courseSlug,
            course_title: courseTitle,
          });
          continueLearning();
        }}
      >
        Continue Learning
      </Link>
      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-surface px-4 text-body-lg font-medium text-neutral-900 hover:shadow-md"
        onClick={() =>
          posthog.capture("course_bookmarked", {
            course_slug: courseSlug,
            course_title: courseTitle,
          })
        }
      >
        <BookmarkIcon className="size-5" />
        Bookmark
      </button>
    </div>
  );
}
