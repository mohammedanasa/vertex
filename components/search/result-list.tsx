import type { SearchResult } from "@/lib/search/types";

import { LessonResultCard } from "./lesson-result-card";
import { VideoResultCard } from "./video-result-card";

/** Renders the mixed result feed, dispatching on the result kind. */
export function ResultList({ results }: { results: SearchResult[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
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
            <VideoResultCard result={result} />
          ) : (
            <LessonResultCard result={result} />
          )}
        </li>
      ))}
    </ul>
  );
}
