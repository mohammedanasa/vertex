"use client";

import posthog from "posthog-js";
import { BookmarkIcon } from "@/components/icons";

/**
 * Presentational only (AGENTS.md §7) — bookmarking has no backend, so this
 * captures the intent for analytics and stores nothing.
 */
export function LessonBookmarkButton({ lessonSlug }: { lessonSlug: string }) {
  return (
    <button
      type="button"
      aria-label="Bookmark this lesson"
      onClick={() => posthog.capture("lesson_bookmarked", { lesson_slug: lessonSlug })}
      className="flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-900 transition-shadow hover:shadow-md"
    >
      <BookmarkIcon className="size-5" />
    </button>
  );
}
