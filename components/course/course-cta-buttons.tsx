"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { BookmarkIcon } from "@/components/icons";

interface CourseCTAButtonsProps {
  continueHref: string;
  courseSlug: string;
  courseTitle: string | null;
}

export function CourseCTAButtons({
  continueHref,
  courseSlug,
  courseTitle,
}: CourseCTAButtonsProps) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Link
        href={continueHref}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
        onClick={() =>
          posthog.capture("course_continue_learning_clicked", {
            course_slug: courseSlug,
            course_title: courseTitle,
          })
        }
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
