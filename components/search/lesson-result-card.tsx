import { CheckCircleIcon, ChevronRightIcon, DocumentIcon, ExternalLinkIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { LessonResult, SortOption } from "@/lib/search/types";

import { SearchResultLink } from "./search-result-link";

import { CourseLine, LessonMeta } from "./result-meta";

/**
 * A lesson matched on its own topic (AGENTS.md §11).
 *
 * The left panel lists the lesson's authored key points; if a lesson has none,
 * the panel falls back to the document icon alone rather than inventing bullets.
 */
export function LessonResultCard({
  result,
  position,
  sort,
}: {
  result: LessonResult;
  position: number;
  sort: SortOption;
}) {
  // Shared by every link on the card, so the click event does not depend on
  // which part of the card the learner hit.
  const tracking = {
    resultType: "lesson" as const,
    position,
    lessonSlug: result.lessonSlug,
    courseSlug: result.courseSlug,
    relevance: result.relevance,
    sort,
  };

  const href = `/lessons/${result.lessonSlug}`;
  const points = result.keyPoints.slice(0, 3);

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-surface p-4 sm:flex-row sm:gap-5">
      {/* Key points panel — the design's left column for lesson results. */}
      <div className="relative flex w-full shrink-0 gap-3 rounded-md bg-neutral-50 p-4 sm:w-64">
        <DocumentIcon className="size-5 shrink-0 text-neutral-500" />
        {points.length > 0 ? (
          <ul className="min-w-0 space-y-2">
            {points.map((point) => (
              <li
                key={point}
                className="flex gap-2 text-small text-neutral-700"
              >
                <span aria-hidden className="text-neutral-500">
                  •
                </span>
                <span className="min-w-0">{point}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <CheckCircleIcon className="absolute right-3 bottom-3 size-6 text-neutral-700" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <CourseLine
            title={result.courseTitle}
            slug={result.courseSlug}
            image={result.courseImage}
          />
          <Badge tone="lesson">Lesson</Badge>
        </div>

        <h3 className="mt-2 font-display text-heading-3 font-bold text-neutral-900">
          <SearchResultLink
            href={href}
            {...tracking}
            className="hover:text-primary-500"
          >
            {result.lessonTitle}
          </SearchResultLink>
        </h3>

        {result.description ? (
          <p className="mt-1 text-body text-neutral-500">{result.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <LessonMeta result={result} />
          <SearchResultLink
            href={href}
            {...tracking}
            className="inline-flex items-center gap-1.5 text-body font-medium text-primary-500 hover:text-primary-600"
          >
            View lesson
            <ExternalLinkIcon className="size-4" />
            <ChevronRightIcon className="size-4" />
          </SearchResultLink>
        </div>
      </div>
    </article>
  );
}
