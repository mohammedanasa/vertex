import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";

/**
 * The model chain the search pipeline runs against.
 *
 * Groq's free tier is 8,000 tokens per minute, which a couple of searches in
 * quick succession will exhaust. Rather than fail (or sit in the AI SDK's
 * retry backoff for ~45s), search falls through to OpenRouter's free models.
 *
 * Order matters: Groq first because it is by far the fastest, then OpenRouter
 * free models as capacity backstops. Every candidate must support structured
 * output, since both pipeline steps generate a schema-validated object.
 */

/** A model in the chain, with the label used in logs. */
export type ModelCandidate = {
  id: string;
  provider: "groq" | "openrouter";
  model: LanguageModel;
};

/**
 * OpenRouter free models, in preference order.
 *
 * Chosen by live-testing every free model that advertises `structured_outputs`
 * against this pipeline's actual schema, not from the advertised capability
 * alone — several models that claim support fail in practice:
 *
 *   liquid/lfm-2.5-2.6b:free            3/3 OK, ~2-4s, clean single-word stems
 *   dots-studio/dots-3-note-preview:free 3/3 OK, ~3-12s
 *   z-ai/glm-5.2:free                    "Provider returned error" on every call
 *   nvidia/nemotron-3-super-120b:free    "Service temporarily overloaded"
 *   minimax/minimax-m3:free              flaky, and returns prose not JSON
 *
 * Re-check with `OPENROUTER_SEARCH_MODELS` if free-tier availability shifts.
 */
const OPENROUTER_FALLBACKS = [
  "liquid/lfm-2.5-2.6b:free",
  "dots-studio/dots-3-note-preview:free",
];

/** Comma-separated override, e.g. "z-ai/glm-5.2:free,google/gemma-4-31b-it:free". */
function openRouterModelIds(): string[] {
  const configured = process.env.OPENROUTER_SEARCH_MODELS;
  if (!configured) return OPENROUTER_FALLBACKS;

  const ids = configured
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : OPENROUTER_FALLBACKS;
}

/**
 * Builds the ordered chain from whichever provider keys are present.
 *
 * Returns an empty array when nothing is configured; the caller reports that
 * as "search is not configured" rather than throwing.
 */
export function buildModelChain(): ModelCandidate[] {
  const chain: ModelCandidate[] = [];

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    const groq = createGroq({ apiKey: groqKey });
    const id = process.env.GROQ_SEARCH_MODEL ?? "openai/gpt-oss-120b";
    chain.push({ id, provider: "groq", model: groq(id) });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const openrouter = createOpenRouter({ apiKey: openRouterKey });
    for (const id of openRouterModelIds()) {
      chain.push({ id, provider: "openrouter", model: openrouter(id) });
    }
  }

  return chain;
}

/**
 * Whether an error means "this model has no capacity right now" — the only
 * case worth retrying on a different model.
 *
 * A bad prompt or an invalid schema fails identically everywhere, so falling
 * through on those would just multiply the latency of a guaranteed failure.
 */
export function isCapacityError(error: unknown): boolean {
  const status = (error as { statusCode?: number; status?: number })?.statusCode
    ?? (error as { status?: number })?.status;

  // 429 rate limited; 402 free-tier credits exhausted; 5xx upstream capacity.
  if (status === 429 || status === 402 || (status && status >= 500)) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("rate limit") ||
    message.includes("rate-limit") ||
    message.includes("quota") ||
    message.includes("request too large") ||
    message.includes("capacity") ||
    message.includes("overloaded") ||
    message.includes("token per minute") ||
    message.includes("tokens per minute") ||
    message.includes("tpm")
  );
}
