"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import posthog from "posthog-js";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { SortOption } from "@/lib/search/types";

interface SearchResultLinkProps {
  href: string;
  resultType: "video" | "lesson";
  /** 1-based rank in the rendered list — position bias is worth measuring. */
  position: number;
  lessonSlug: string;
  courseSlug: string;
  relevance: number;
  sort: SortOption;
  /** Matched second for a video result; null for a lesson result. */
  startSeconds?: number | null;
  className?: string;
  "aria-label"?: string;
  children: ReactNode;
}

/**
 * A result card link that reports the click.
 *
 * The cards themselves stay server components — only this handler crosses into
 * the browser bundle. A card has several links to the same result (poster,
 * title, call to action) and every one of them routes through here, so the
 * event does not depend on which part of the card was clicked.
 *
 * A video result also fires `resume_used`: the same click is both a search
 * outcome and a learner picking a lesson back up at a specific moment, and the
 * two questions get asked by different funnels.
 */
export function SearchResultLink({
  href,
  resultType,
  position,
  lessonSlug,
  courseSlug,
  relevance,
  sort,
  startSeconds = null,
  className,
  "aria-label": ariaLabel,
  children,
}: SearchResultLinkProps) {
  function report() {
    posthog.capture(ANALYTICS_EVENTS.SEARCH_RESULT_OPENED, {
      result_type: resultType,
      result_position: position,
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      relevance,
      sort,
      start_seconds: startSeconds,
    });

    if (resultType === "video") {
      posthog.capture(ANALYTICS_EVENTS.RESUME_USED, {
        source: "search_video_result",
        lesson_slug: lessonSlug,
        course_slug: courseSlug,
        start_seconds: startSeconds,
      });
    }
  }

  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={report}>
      {children}
    </Link>
  );
}
