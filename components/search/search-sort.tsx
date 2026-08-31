"use client";

import { useRouter } from "next/navigation";

import { ChevronDownIcon } from "@/components/icons";

import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/search/types";

/**
 * Sort control. Defaults to "Most Relevant" (AGENTS.md §11) and writes the
 * choice to the URL so a sorted result page is shareable.
 */
export function SearchSort({
  query,
  sort,
}: {
  query: string;
  sort: SortOption;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Sort results</span>
      <div className="relative">
        <select
          value={sort}
          onChange={(event) => {
            const params = new URLSearchParams({ q: query });
            if (event.target.value !== "relevance") {
              params.set("sort", event.target.value);
            }
            router.push(`/search?${params.toString()}`);
          }}
          className="h-11 w-full appearance-none rounded-md border border-neutral-200 bg-surface pr-11 pl-4 text-body-lg text-neutral-900 focus:border-primary-400 focus:outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-neutral-900" />
      </div>
    </label>
  );
}
