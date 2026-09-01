"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import posthog from "posthog-js";
import { BookmarkFilledIcon, BookmarkIcon } from "@/components/icons";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

const LABELS = {
  course: { on: "Remove this course from Saved", off: "Save this course" },
  lesson: { on: "Remove this lesson from Saved", off: "Save this lesson" },
} as const;

const EVENTS = {
  course: {
    on: ANALYTICS_EVENTS.COURSE_BOOKMARKED,
    off: ANALYTICS_EVENTS.COURSE_UNBOOKMARKED,
  },
  lesson: {
    on: ANALYTICS_EVENTS.LESSON_BOOKMARKED,
    off: ANALYTICS_EVENTS.LESSON_UNBOOKMARKED,
  },
} as const;

const BASE =
  "flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-surface transition-shadow hover:shadow-md";

export interface BookmarkButtonProps {
  kind: "course" | "lesson";
  /**
   * The Sanity document `_id`. This is what gets stored — never the slug, which
   * is editable content an author could rename out from under a saved item.
   */
  id: string;
  /** Slug, for analytics only. */
  slug: string;
  /** Stored state, read on the server. */
  initialBookmarked?: boolean;
  /** Signed-out visitors get a sign-in prompt instead of a write that would 401. */
  isSignedIn?: boolean;
  className?: string;
}

/**
 * Bookmark toggle for a course or a lesson.
 *
 * Persisted per learner (AGENTS.md §5): the click POSTs to `/api/progress`,
 * which is the only thing that writes. The browser holds no token and never
 * touches Sanity directly.
 *
 * The toggle is optimistic — it flips immediately and reverts if the write
 * fails. Bookmarking is high-frequency and low-stakes, so a spinner on every
 * click would read as broken. Failure is announced through an `aria-live`
 * region rather than visible error copy, because this button usually sits in a
 * card with no room for a message.
 *
 * On a card the title is a link and this button sits inside it, so the click is
 * stopped from bubbling into that navigation.
 */
export function BookmarkButton({
  kind,
  id,
  slug,
  initialBookmarked = false,
  isSignedIn = false,
  className,
}: BookmarkButtonProps) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [serverValue, setServerValue] = useState(initialBookmarked);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Adjusting state during render, rather than syncing it in an effect: when
  // the server sends a new value (a router.refresh, or navigating back to a
  // cached page) it wins and the optimistic guess is dropped. React's
  // documented pattern for resetting state on a prop change — an effect here
  // would cascade an extra render.
  if (serverValue !== initialBookmarked) {
    setServerValue(initialBookmarked);
    setOptimistic(null);
  }

  const bookmarked = optimistic ?? initialBookmarked;
  const setBookmarked = setOptimistic;

  async function toggle() {
    const next = !bookmarked;

    // Optimistic: flip now, reconcile after the write.
    setBookmarked(next);
    setFailed(false);

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-bookmark",
          kind,
          ...(kind === "course" ? { courseId: id } : { lessonId: id }),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));

      // The route returns the resulting state, so a double-click or a stale
      // optimistic guess settles on what was actually stored.
      const result = (await response.json()) as { bookmarked?: boolean };
      const stored = result.bookmarked ?? next;
      setBookmarked(stored);

      // Only after the write lands, so a failure is never counted as a save.
      posthog.capture(stored ? EVENTS[kind].on : EVENTS[kind].off, {
        [kind === "course" ? "course_slug" : "lesson_slug"]: slug,
      });

      // Keep other server-rendered surfaces (the Saved page, other cards for
      // this same item) in step.
      startTransition(() => router.refresh());
    } catch {
      setBookmarked(!next);
      setFailed(true);
    }
  }

  const label = bookmarked ? LABELS[kind].on : LABELS[kind].off;
  const Icon = bookmarked ? BookmarkFilledIcon : BookmarkIcon;

  // Signed out: the page itself stays public (§7), but there is nowhere to save
  // to, so the control opens Clerk rather than posting a write that would 401.
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          aria-label={LABELS[kind].off}
          className={cn(BASE, "text-neutral-900", className)}
          onClick={(event) => event.stopPropagation()}
        >
          <BookmarkIcon className="size-5" />
        </button>
      </SignInButton>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={bookmarked}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void toggle();
        }}
        className={cn(
          BASE,
          bookmarked ? "text-primary-500" : "text-neutral-900",
          className,
        )}
      >
        <Icon className="size-5" />
      </button>
      <span aria-live="polite" className="sr-only">
        {failed ? "That didn't save. Try again." : ""}
      </span>
    </>
  );
}
