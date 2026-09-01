import "server-only";

import { Output, generateText } from "ai";
import type { z } from "zod";

import {
  ANALYTICS_EVENTS,
  normalizeQueryProperty,
  type SearchRunSource,
} from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/posthog-server";
import { searchLessonsByStems } from "@/sanity/lib/data";

import { countCourses, hydrateResults, sortResults } from "./hydrate";
import { fetchInitialContext } from "./mcp";
import { buildModelChain, isCapacityError } from "./models";
import {
  RANK_SYSTEM_PROMPT,
  STEMS_SYSTEM_PROMPT,
  buildRankPrompt,
  buildStemsPrompt,
} from "./prompt";
import {
  MAX_CANDIDATES,
  SearchRankingSchema,
  SearchStemsSchema,
} from "./schema";
import type { SearchResponse, SortOption } from "./types";

/**
 * The search pipeline.
 *
 *   0. The Sanity Context MCP supplies the dataset schema overview, cached.
 *   1. The model expands the phrase into keyword stems.
 *   2. The server runs a fixed GROQ query with those stems as a bound
 *      parameter, pre-ranked by which field matched.
 *   3. The model keeps and scores the candidates that genuinely answer it.
 *   4. The server re-fetches every display field for the survivors, and
 *      resolves each one to specific moments in its video — chapters first,
 *      transcript as the fallback.
 *
 * The model never writes GROQ and never supplies display data, so a bad
 * response costs relevance and nothing else — it cannot produce a malformed
 * query or a lesson that does not exist (AGENTS.md §11).
 *
 * Everything runs on the server: the browser holds neither the Sanity read
 * token nor the model key, and never calls the MCP or the LLM (§5).
 */

/** Words too common to narrow a search; dropped from model-supplied stems. */
const STEM_STOPWORDS = new Set([
  "to", "in", "of", "on", "at", "by", "is", "it", "as", "or", "an", "be",
  "do", "if", "so", "up", "we", "my", "me",
  "the", "and", "for", "with", "how", "what", "why", "when", "your", "you",
  "this", "that", "from", "into", "using", "use", "used", "about", "its",
  "are", "was", "were", "can", "will", "all", "any", "not", "but",
]);

/** Longest query accepted. Keeps prompt size and cost bounded. */
export const MAX_QUERY_LENGTH = 200;


export function normalizeQuery(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_QUERY_LENGTH) : "";
}

function emptyResponse(query: string, error?: string): SearchResponse {
  return { query, results: [], resultCount: 0, courseCount: 0, error };
}

/**
 * Normalizes model-supplied stems into safe, wildcarded match tokens.
 *
 * Some models return multi-word stems ("data fetch*") despite being asked for
 * single words. GROQ `match` is token based, so those must be split rather than
 * de-spaced — joining them into "datafetch*" matches nothing and the search
 * silently returns zero results.
 */
function normalizeStems(stems: string[]): string[] {
  const cleaned = stems
    // Split on whitespace so a multi-word stem becomes several usable tokens.
    .flatMap((stem) => stem.toLowerCase().split(/\s+/))
    // Keep letters, digits and the wildcard; GROQ `match` treats punctuation as
    // a token separator, so stripping it avoids dead stems.
    .map((stem) => stem.replace(/[^a-z0-9*]/g, ""))
    // Drop stopwords a model may leave in a split phrase — they would match
    // most of the catalog and swamp the real signal.
    .filter((stem) => !STEM_STOPWORDS.has(stem.replace(/\*/g, "")))
    .filter((stem) => stem.replace(/\*/g, "").length >= 2)
    .map((stem) => (stem.endsWith("*") ? stem : `${stem}*`));

  return [...new Set(cleaned)].slice(0, 8);
}

/**
 * Runs one structured-output generation, walking the model chain.
 *
 * Falls through to the next model only on a capacity error (rate limit, quota,
 * upstream overload). Any other failure — a bad schema, a malformed prompt —
 * would fail identically on every model, so it is thrown immediately rather
 * than retried three more times.
 *
 * `chain` is walked in order and the first success wins, so a healthy Groq
 * keeps serving every request and OpenRouter is only touched under pressure.
 */
async function generateWithFailover<T>({
  chain,
  system,
  prompt,
  schema,
  name,
  step,
}: {
  chain: ReturnType<typeof buildModelChain>;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  name: string;
  step: string;
}): Promise<T> {
  let lastError: unknown;

  for (const candidate of chain) {
    try {
      const { output } = await generateText({
        model: candidate.model,
        system,
        prompt,
        output: Output.object({ schema, name }),
        // One attempt per model: the chain itself is the retry strategy, and
        // the SDK's default backoff would sit on a rate limit for ~45s before
        // we ever reach a model that has capacity.
        maxRetries: 0,
      });
      return output;
    } catch (error) {
      lastError = error;

      if (!isCapacityError(error)) throw error;

      console.warn(
        `[search] ${step}: ${candidate.provider}/${candidate.id} out of capacity, trying next`,
      );
    }
  }

  throw lastError ?? new Error("No search model available");
}

/**
 * Emits `search_performed` for a completed run, including one that matched
 * nothing — "no results" is a successful search with a zero count, not a
 * failure, and conflating the two hides the empty-result funnel.
 */
async function captureSearchPerformed({
  query,
  sort,
  source,
  results,
  courseCount,
  stemCount,
  startedAt,
}: {
  query: string;
  sort: SortOption;
  source: SearchRunSource;
  results: SearchResponse["results"];
  courseCount: number;
  stemCount: number;
  startedAt: number;
}): Promise<void> {
  await captureServerEvent(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
    query: normalizeQueryProperty(query),
    query_length: query.length,
    sort,
    source,
    result_count: results.length,
    course_count: courseCount,
    video_result_count: results.filter((r) => r.kind === "video").length,
    lesson_result_count: results.filter((r) => r.kind === "lesson").length,
    stem_count: stemCount,
    has_results: results.length > 0,
    duration_ms: Date.now() - startedAt,
  });
}

/**
 * Analytics for the search pipeline is captured here rather than in the page,
 * because this is where a search actually happens — the model calls, the GROQ
 * query and the hydration. The page and the API route both funnel through it,
 * so neither can run a search that goes uncounted.
 *
 * The normalized query text is sent alongside its length: what learners ask the
 * catalog is the point of instrumenting search at all, and it is normalized so
 * the same phrase aggregates as one value.
 */
export async function runSearch(
  rawQuery: string,
  sort: SortOption = "relevance",
  source: SearchRunSource = "page",
): Promise<SearchResponse> {
  const query = normalizeQuery(rawQuery);
  if (!query) return emptyResponse("");

  const startedAt = Date.now();

  const chain = buildModelChain();
  if (chain.length === 0) {
    // Generic message to the user; the detail stays in the server log.
    console.error(
      "[search] no model configured — set GROQ_API_KEY and/or OPENROUTER_API_KEY",
    );

    await captureServerEvent(ANALYTICS_EVENTS.SEARCH_FAILED, {
      query: normalizeQueryProperty(query),
      query_length: query.length,
      sort,
      source,
      reason: "unconfigured",
      duration_ms: Date.now() - startedAt,
    });

    return emptyResponse(query, "Search is not configured.");
  }

  try {
    // 0/1. Phrase -> keyword stems, grounded in the dataset's own schema.
    //
    // The schema overview comes from the Context MCP's `/initial-context`
    // endpoint and is cached, so this costs one fetch per server start. It is
    // what ties stem generation to the real content model rather than to the
    // model's guess about it. A null overview degrades stem quality slightly
    // but does not break search.
    const initialContext = await fetchInitialContext();

    const stemsOutput = await generateWithFailover({
      chain,
      system: STEMS_SYSTEM_PROMPT,
      prompt: buildStemsPrompt(query, initialContext),
      schema: SearchStemsSchema,
      name: "stems",
      step: "stems",
    });

    const stems = normalizeStems(stemsOutput.stems);
    if (stems.length === 0) {
      await captureSearchPerformed({
        query, sort, source, results: [], courseCount: 0,
        stemCount: 0, startedAt,
      });
      return emptyResponse(query);
    }

    // 2. Fixed, parameterized query — the model never authors GROQ.
    const candidates = await searchLessonsByStems(stems, MAX_CANDIDATES);
    if (candidates.length === 0) {
      await captureSearchPerformed({
        query, sort, source, results: [], courseCount: 0,
        stemCount: stems.length, startedAt,
      });
      return emptyResponse(query);
    }

    // 3. Keep and score the candidates that genuinely answer the query.
    const ranking = await generateWithFailover({
      chain,
      system: RANK_SYSTEM_PROMPT,
      prompt: buildRankPrompt(query, candidates),
      schema: SearchRankingSchema,
      name: "ranked_lessons",
      step: "rank",
    });

    // Guard against the model returning an id that was not offered to it.
    const offered = new Set(candidates.map((c) => c._id));
    const vetted = {
      results: ranking.results.filter((r) => offered.has(r.lessonId)),
    };

    // 4. Re-read every display field from Sanity, and resolve each lesson to
    //    the matched moments in its video. The stems are reused for the moment
    //    match so the timestamp reflects the same keywords the lesson matched.
    const results = sortResults(await hydrateResults(vetted, stems), sort);
    const courseCount = countCourses(results);

    await captureSearchPerformed({
      query, sort, source, results, courseCount,
      stemCount: stems.length, startedAt,
    });

    return {
      query,
      results,
      // Both counts come from hydrated data, never from the model.
      resultCount: results.length,
      courseCount,
    };
  } catch (error) {
    console.error("[search] failed", error);

    await captureServerEvent(ANALYTICS_EVENTS.SEARCH_FAILED, {
      query: normalizeQueryProperty(query),
      query_length: query.length,
      sort,
      source,
      reason: "pipeline_error",
      duration_ms: Date.now() - startedAt,
    });

    return emptyResponse(query, "Search is temporarily unavailable.");
  }
}
