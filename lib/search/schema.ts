import { z } from "zod";

/**
 * The only thing the model is allowed to return.
 *
 * Deliberately minimal: ids and a rank. Every display field is fetched from
 * Sanity afterwards, so a hallucinated id resolves to nothing and is dropped
 * rather than rendered as a fake lesson (AGENTS.md §11).
 */
export const RankedLessonSchema = z.object({
  lessonId: z
    .string()
    .describe("The exact _id of a lesson document returned by groq_query."),
  relevance: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "How well this lesson answers the query. 1 is a direct match on the lesson's core topic, 0.5 a partial match, below 0.3 tangential.",
    ),
});

/** Hard ceiling on ids per response, so one query cannot balloon the context. */
export const MAX_RESULTS = 40;

export const SearchRankingSchema = z.object({
  results: z
    .array(RankedLessonSchema)
    .max(MAX_RESULTS)
    .describe(
      "Matching lessons, most relevant first. Empty when nothing genuinely matches.",
    ),
});

export type SearchRanking = z.infer<typeof SearchRankingSchema>;

/** How many keyword-matched lessons to put in front of the ranking model. */
export const MAX_CANDIDATES = 60;

/** Step 1 output: the wildcarded keyword stems to search with. */
export const SearchStemsSchema = z.object({
  stems: z
    .array(z.string())
    .min(1)
    .max(8)
    .describe('Lowercase wildcard stems, e.g. ["data*", "fetch*", "cach*"].'),
});

export type SearchStems = z.infer<typeof SearchStemsSchema>;
