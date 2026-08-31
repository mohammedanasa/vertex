"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import posthog from "posthog-js";
import { SearchInput } from "@/components/ui/input";

/** Routes to the search results page; the search page owns the real query logic. */
export function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function submit() {
    const query = value.trim();
    if (!query) return;
    posthog.capture("course_searched", { query_length: query.length });
    router.push(`/search?${new URLSearchParams({ q: query }).toString()}`);
  }

  return (
    <SearchInput
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
      }}
      placeholder="Ask anything about your learning…"
      aria-label="Search your learning"
    />
  );
}
