import type { Metadata } from "next";

import { SearchBar } from "@/components/search/search-bar";
import { SearchEmptyState } from "@/components/search/empty-state";
import { ResultList } from "@/components/search/result-list";
import { SearchSort } from "@/components/search/search-sort";
import { SearchViewTracker } from "@/components/search/search-view-tracker";
import { SiteHeader } from "@/components/site-header";
import { runSearch } from "@/lib/search/search";
import { parseSortOption } from "@/lib/search/types";

/**
 * The search results page (AGENTS.md §11): a full results page with a count and
 * a sort control, not a widget and not a chatbox.
 *
 * A server component — the MCP call, the model call, and the Sanity read all
 * happen here, so no key or token is ever shipped to the browser.
 */

// Results depend on a live model call, so this can never be statically rendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search — Vertex",
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q, sort } = await searchParams;

  const query = typeof q === "string" ? q.trim() : "";
  const sortOption = parseSortOption(sort);

  const { results, resultCount, courseCount, error } = query
    ? await runSearch(query, sortOption)
    : { results: [], resultCount: 0, courseCount: 0, error: undefined };

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-6 py-12">
          <div className="flex flex-col items-center text-center">
            <span className="rounded-xs bg-primary-100 px-2 py-1 text-small font-semibold tracking-wider text-primary-500 uppercase">
              Search Results
            </span>

            <h1 className="mt-4 font-display text-display-2 font-bold text-neutral-900">
              {query ? (
                <>
                  Results for{" "}
                  <span className="text-primary-500">&ldquo;{query}&rdquo;</span>
                </>
              ) : (
                "Search"
              )}
            </h1>

            {query && !error ? (
              <p className="mt-2 text-body-lg text-neutral-500">
                Found {resultCount} {resultCount === 1 ? "result" : "results"}
                {courseCount > 0
                  ? ` across ${courseCount} ${courseCount === 1 ? "course" : "courses"}`
                  : ""}
              </p>
            ) : null}

            <div className="mt-6 w-full max-w-xl">
              <SearchBar initialQuery={query} sort={sortOption} />
            </div>
          </div>

          {error ? (
            <p
              role="status"
              className="mt-10 rounded-lg border border-neutral-200 bg-surface p-6 text-center text-body text-neutral-500"
            >
              {error} Please try again in a moment.
            </p>
          ) : null}

          {query && !error ? (
            <>
              <SearchViewTracker
                queryLength={query.length}
                resultCount={resultCount}
                courseCount={courseCount}
              />

              {resultCount > 0 ? (
                <>
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-body-lg font-medium text-neutral-900">
                      {resultCount} {resultCount === 1 ? "result" : "results"}
                    </p>
                    <SearchSort query={query} sort={sortOption} />
                  </div>

                  <div className="mt-4">
                    <ResultList results={results} />
                  </div>
                </>
              ) : null}

              <div className="mt-4">
                <SearchEmptyState
                  {...(resultCount === 0
                    ? {
                        title: "No results found",
                        description:
                          "Try different keywords or browse our full course catalog.",
                      }
                    : {})}
                />
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}
