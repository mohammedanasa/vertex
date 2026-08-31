import Link from "next/link";

import { ArrowRightIcon, SearchIcon } from "@/components/icons";

/**
 * Shown when a query returns nothing, and as the footer beneath results.
 * Always points at the full catalog (AGENTS.md §11).
 */
export function SearchEmptyState({
  title = "Can't find what you're looking for?",
  description = "Try different keywords or browse our full course catalog.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-lg bg-primary-100/60 p-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-100">
          <SearchIcon className="size-5 text-primary-500" />
        </span>
        <div>
          <p className="font-display text-heading-3 font-bold text-neutral-900">
            {title}
          </p>
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      <Link
        href="/courses"
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-surface px-4 text-body-lg font-medium text-primary-500 shadow-sm transition-colors hover:bg-primary-100"
      >
        Browse all courses
        <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}
