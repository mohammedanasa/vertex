"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { BookmarkFilledIcon, BookmarkIcon } from "@/components/icons";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

const LABELS = {
  course: { on: "Remove bookmark from this course", off: "Bookmark this course" },
  lesson: { on: "Remove bookmark from this lesson", off: "Bookmark this lesson" },
} as const;

/**
 * Bookmark toggle for a course or a lesson.
 *
 * Presentational only (AGENTS.md §7). There is no bookmark document and no
 * server route, so the pressed state lives in React and is gone on reload; the
 * PostHog event is the only thing that outlives the click. Deliberately no
 * "Saved" copy — the control must not imply storage it does not have.
 *
 * On a card the title is a link and this button sits inside it, so the click is
 * stopped from bubbling into that navigation.
 */
export function BookmarkButton({
  kind,
  slug,
  className,
}: {
  kind: "course" | "lesson";
  slug: string;
  className?: string;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const Icon = bookmarked ? BookmarkFilledIcon : BookmarkIcon;

  return (
    <button
      type="button"
      aria-label={bookmarked ? LABELS[kind].on : LABELS[kind].off}
      aria-pressed={bookmarked}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !bookmarked;
        setBookmarked(next);
        // Only the intent to save is worth an event; un-bookmarking is noise.
        if (next) {
          posthog.capture(
            kind === "course"
              ? ANALYTICS_EVENTS.COURSE_BOOKMARKED
              : ANALYTICS_EVENTS.LESSON_BOOKMARKED,
            kind === "course" ? { course_slug: slug } : { lesson_slug: slug },
          );
        }
      }}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-surface transition-shadow hover:shadow-md",
        bookmarked ? "text-primary-500" : "text-neutral-900",
        className,
      )}
    >
      <Icon className="size-5" />
    </button>
  );
}
