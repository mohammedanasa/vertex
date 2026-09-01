"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import {
  ANALYTICS_EVENTS,
  normalizeQueryProperty,
} from "@/lib/analytics/events";
import type { SortOption } from "@/lib/search/types";

/**
 * Captures the search-results view, and separately captures a search that
 * matched nothing.
 *
 * An empty result set is its own product failure — the learner asked for
 * something the catalog does not answer — so it gets a dedicated event rather
 * than being left as a zero on `search_results_viewed`, which would force every
 * dashboard to reconstruct it with a filter.
 *
 * Sends the normalized query alongside the counts, so a zero-result search can
 * be read as the phrase that failed rather than just a length.
 */
export function SearchViewTracker({
  query,
  resultCount,
  courseCount,
  sort,
}: {
  query: string;
  resultCount: number;
  courseCount: number;
  sort: SortOption;
}) {
  useEffect(() => {
    const queryProperty = normalizeQueryProperty(query);

    posthog.capture(ANALYTICS_EVENTS.SEARCH_RESULTS_VIEWED, {
      query: queryProperty,
      query_length: query.length,
      result_count: resultCount,
      course_count: courseCount,
      sort,
      has_results: resultCount > 0,
    });

    // The phrases that return nothing are the most actionable search data there
    // is — each one is a gap in the catalog or in the ranking.
    if (resultCount === 0) {
      posthog.capture(ANALYTICS_EVENTS.SEARCH_NO_RESULTS, {
        query: queryProperty,
        query_length: query.length,
        sort,
      });
    }
  }, [query, resultCount, courseCount, sort]);

  return null;
}
