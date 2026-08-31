import type { SearchResult } from "@/lib/search/types";

import { LessonResultCard } from "./lesson-result-card";
import { VideoResultCard } from "./video-result-card";

/** Renders the mixed result feed, dispatching on the result kind. */
export function ResultList({ results }: { results: SearchResult[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {results.map((result) => (
        <li key={`${result.kind}:${result.lessonId}`}>
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
