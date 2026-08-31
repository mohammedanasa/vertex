"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Captures the search-results view (AGENTS.md §7 — instrument a search
 * performed). Sends only the query length and result counts, never the raw
 * query text or anything user-identifying.
 */
export function SearchViewTracker({
  queryLength,
  resultCount,
  courseCount,
}: {
  queryLength: number;
  resultCount: number;
  courseCount: number;
}) {
  useEffect(() => {
    posthog.capture("search_results_viewed", {
      query_length: queryLength,
      result_count: resultCount,
      course_count: courseCount,
    });
  }, [queryLength, resultCount, courseCount]);

  return null;
}
