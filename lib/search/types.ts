/**
 * Result shapes for the search page.
 *
 * Every field here is populated by the server-side hydration step
 * (`lib/search/hydrate.ts`), never by the language model. The model only ever
 * returns lesson ids and a rank — see `lib/search/schema.ts`. That split is what
 * makes AGENTS.md §11's "never invent a course, lesson, timestamp, or count"
 * structural rather than a hope.
 */

/** An image reference carried through to `urlFor()` on the server. */
export type SearchImage = {
  asset?: { _ref?: string | null } | null;
  alt?: string | null;
} | null;

type BaseResult = {
  /** The lesson document id. Stable, and the de-duplication key. */
  lessonId: string;
  lessonTitle: string;
  lessonSlug: string;
  /** Short grounded blurb: the lesson's own opening prose, not model-written. */
  description: string;
  courseTitle: string;
  courseSlug: string;
  courseImage: SearchImage;
  /** Derived positionally, e.g. "5.1" — never stored, never model-supplied. */
  lessonLabel: string | null;
  /** The parent module's title, e.g. "Data Fetching and Caching". */
  moduleTitle: string | null;
  /** The parent module's 1-based position, e.g. 5. */
  moduleNumber: number | null;
  /** Rank score from the model, used only for ordering. */
  relevance: number;
  /** Lesson length in seconds. Powers the duration sort. */
  durationSeconds: number;
};

/**
 * A lesson matched on its own topic. Renders the key-points panel.
 */
export type LessonResult = BaseResult & {
  kind: "lesson";
  keyPoints: string[];
};

/**
 * A lesson's video matched at a specific moment.
 *
 * Built by `hydrateResults` from the `video` document that shares the lesson's
 * `videoUrl`: a matching chapter label if there is one, otherwise a matching
 * transcript chunk (AGENTS.md §7).
 *
 * A video result is always tied to the lesson that uses the video, and a video
 * document is never surfaced on its own (§7). `startSeconds` always comes from
 * a stored `startSeconds` on that document — the model never supplies it, so a
 * timestamp cannot be invented.
 */
export type VideoResult = BaseResult & {
  kind: "video";
  /** The matched second; the card links to the lesson at this offset. */
  startSeconds: number;
  /** Lesson thumbnail shown as the clip's poster. */
  thumbnail: SearchImage;
  /** Clip length in seconds, shown bottom-right on the poster. */
  clipSeconds: number | null;
};

export type SearchResult = LessonResult | VideoResult;

export const SORT_OPTIONS = ["relevance", "duration", "title"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  relevance: "Most Relevant",
  duration: "Shortest First",
  title: "Title (A–Z)",
};

export function parseSortOption(value: unknown): SortOption {
  return SORT_OPTIONS.includes(value as SortOption)
    ? (value as SortOption)
    : "relevance";
}

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  /** Hydrated result count — derived, never taken from the model. */
  resultCount: number;
  /** Distinct courses across the hydrated results. */
  courseCount: number;
  /** Set when the search could not run (misconfiguration, upstream failure). */
  error?: string;
};
