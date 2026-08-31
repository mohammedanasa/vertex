import { MAX_RESULTS } from "./schema";

/**
 * Prompts for the search agent.
 *
 * The agent's job is deliberately small: turn a learner's phrase into keyword
 * stems, then judge which of the returned lessons actually answer it. It never
 * writes GROQ — the query lives in `sanity/lib/queries.ts`, so a malformed or
 * hostile query is not a possibility, and every id it ranks came from a real
 * query result (AGENTS.md §11 grounding).
 *
 * The critical rules are duplicated in the Sanity Context document
 * (`sanity/context/vertex-search.json`), because the model follows the inline
 * system prompt more reliably than injected Context instructions (§12).
 */

/** Step 1: query phrase -> wildcarded keyword stems. */
export const STEMS_SYSTEM_PROMPT = `You expand a course-search phrase into keyword stems for a token-based text search.

Rules:
- Output stems only, lowercase, each ending in "*" (e.g. fetch*, cach*).
- Stem to the shared root so variants match: "caching" -> cach*, "routing" -> rout*.
- Include the query's own words plus closely related terms a course catalog
  would actually use for the same concept.
- 3 to 8 stems. Do not add tangential topics — a stem that pulls in unrelated
  lessons is worse than a missing one.
- Drop filler words (how, what, the, in, to, a, of, for, and, with).

Example: "data fetching in next.js" -> data*, fetch*, cach*, revalidat*, server*`;

export function buildStemsPrompt(
  query: string,
  initialContext: string | null,
): string {
  return [
    `Search phrase: "${query}"`,
    initialContext
      ? `\nThe catalog this searches:\n${initialContext}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Step 2: pick and score the lessons that genuinely answer the query.
 *
 * The candidates are already ordered by field specificity, so the model is
 * judging relevance rather than ordering from scratch.
 */
export const RANK_SYSTEM_PROMPT = `You choose which lessons answer a learner's search query.

You are given candidate lessons already matched by keyword. Keep the ones that
genuinely answer the query and score each from 0 to 1:

- 1.0  squarely about the query's topic
- 0.5  covers it as one part of a broader topic
- <0.3 tangential

Rules:
- Rank by specificity: a lesson whose title contains the concept outranks one
  that only mentions it in passing.
- Keep every genuinely relevant lesson, up to ${MAX_RESULTS}. Do not trim to a
  handful, and do not pad with weak matches.
- A keyword can match the wrong sense of a word. "Data types and JSONB" is not
  about data fetching; drop that kind of match.
- Copy each _id exactly as given. Never invent, repair, or complete an id.
- If no candidate genuinely answers the query, return an empty list.`;

export function buildRankPrompt(
  query: string,
  candidates: Array<{ _id: string; title: string | null }>,
): string {
  const list = candidates
    .map((c) => `${c._id} | ${c.title ?? "Untitled"}`)
    .join("\n");

  return `Search query: "${query}"

Candidate lessons (_id | title):
${list}`;
}
