"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";

import { SearchInput } from "@/components/ui/input";

/**
 * The results-page search field, prefilled with the active query.
 *
 * Client-side only for input and navigation — the search itself runs on the
 * server, so no key or token is involved here (AGENTS.md §5).
 */
export function SearchBar({
  initialQuery,
  sort,
}: {
  initialQuery: string;
  sort?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);

  function submit() {
    const query = value.trim();
    if (!query || query === initialQuery) return;

    posthog.capture("course_searched", { query_length: query.length });

    const params = new URLSearchParams({ q: query });
    if (sort && sort !== "relevance") params.set("sort", sort);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <SearchInput
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") submit();
      }}
      placeholder="Ask anything about your learning…"
      aria-label="Search your learning"
    />
  );
}
