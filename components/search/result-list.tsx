import type { SearchResult, SortOption } from "@/lib/search/types";

import { LessonResultCard } from "./lesson-result-card";
import { VideoResultCard } from "./video-result-card";

/** Renders the mixed result feed, dispatching on the result kind. */
export function ResultList({
  results,
  sort,
}: {
  results: SearchResult[];
  sort: SortOption;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {results.map((result, index) => (
        // A lesson can yield several video moments, so the start offset is part
        // of the key — `kind:lessonId` alone would collide between them.
        <li
          key={
            result.kind === "video"
              ? `video:${result.lessonId}:${result.startSeconds}`
              : `lesson:${result.lessonId}`
          }
        >
          {result.kind === "video" ? (
            // 1-based so the rank reads the way a learner sees it.
            <VideoResultCard result={result} position={index + 1} sort={sort} />
          ) : (
            <LessonResultCard result={result} position={index + 1} sort={sort} />
          )}
        </li>
      ))}
    </ul>
  );
}
