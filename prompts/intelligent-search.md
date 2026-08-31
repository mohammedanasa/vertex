# Implementation prompt — Intelligent search

## Goal

Ship the intelligent search feature end to end: connect the Sanity Context MCP,
build the server-side search API, and render the `/search` results page with the
two result kinds (video and lesson) over courses and lessons — matching
`design/vertex-search.png` exactly.

`components/home/hero-search.tsx` already routes to `/search?q=…`. That route does
not exist yet. This prompt creates it.

---

## Scope decisions (confirmed with the user)

1. **Lessons now, video moments after.** Video-moment results need `video`
   documents that do not exist (see Findings). The `VIDEO` result card is built
   and typed, but returns nothing until the ingestion pipeline lands. The search
   pipeline is written so adding video results later is additive, not a rewrite.
2. **LLM provider is Groq inference** (groq.com, `@ai-sdk/groq`, `GROQ_API_KEY`) —
   a deliberate deviation from AGENTS.md §6, which names the OpenAI provider.
   The user chose this. Naming note: "Groq" the inference provider is distinct
   from "GROQ" the Sanity query language; both appear in this codebase.

---

## Skills read

- `create-agent-with-sanity-context` — MCP wiring, `/initial-context` injection
  and caching, `createMCPClient` over HTTP, excluding the `initial_context` tool
  when its payload is already in the system prompt.
- `dial-your-context` — Instructions as pure deltas only; verify every claim with
  a real query before writing it down; propose a `groqFilter` to scope content.
- `shape-your-agent` — less is more; the system prompt covers behaviour and
  guardrails, not schema or GROQ syntax.
- `node_modules/next/dist/docs/` — App Router route handlers and the
  server/client boundary.

## Code inspected

- `sanity/lib/client.ts`, `env.ts`, `live.ts` — `server-only` client;
  `defineLive` with `browserToken: false`.
- `sanity/lib/data.ts` — the existing module/lesson numbering derivation, which
  this feature must stay consistent with.
- `sanity/lib/queries.ts` — `defineQuery` + shared projection conventions.
- `lib/video.ts` — `parseStartSeconds` already accepts the `startSeconds` alias
  "that search results link with"; `buildYouTubeEmbedUrl` seeks via YouTube's
  own `start` param. The lesson page is already wired for deep links.
- `lib/format.ts` — `formatDuration`, `formatCount`, `portableTextToPlainText`.
- `components/ui/badge.tsx` — already ships `video` and `lesson` badge tones.
- `components/ui/{input,select,button,card,breadcrumbs}.tsx`, `components/icons.tsx`.

---

## Findings from the live dataset (verified, not assumed)

Run against project `6xdciolp`, dataset `production`:

| # | Check | Result |
|---|---|---|
| 1 | MCP `tools/list` on base URL | ✅ Live — `initial_context`, `groq_query`, `schema_explorer` |
| 2 | `text::semanticSimilarity()` | ❌ **"Embeddings are not enabled for this dataset"** |
| 3 | `title match ["data*","fetch*"]` | ✅ 1 lesson |
| 4 | `pt::text(notes) match [...]` | ✅ 3 lessons for "data fetching" |
| 5 | `count(*[_type=="video"])` | **0** — and no `video` schema type exists |
| 6 | `count(*[_type=="sanity.agentContext"])` | **0** — no Context document yet |
| 7 | Reverse ref lesson → course → module title | ✅ Returns "Data Fetching and Caching" |
| 8 | `modules[].title` + `myModule.lessons[]->slug` | ✅ Enough to derive exact numbering |

Finding 2 confirms AGENTS.md §12: **keyword + wildcard matching is the only
path**. Do not write `text::semanticSimilarity()` anywhere.

Finding 5 is why video results are deferred: `videos.json` holds only
`{id, title, channel, duration, query}` per lesson slug — no chapters, no
transcript chunks.

---

## Implementation note: architecture revised during build

The prompt originally had the model author GROQ through the MCP's `groq_query`
tool. Live testing forced two changes:

1. **The provider rejects structured output combined with tool calling**
   ("json mode cannot be combined with tool/function calling"), so the tool loop
   could not return a schema directly.
2. **The free-tier budget is 8,000 TPM.** MCP tool definitions are ~3.8k tokens
   and are re-sent every step, so one search cost ~10.1k tokens and was rejected
   outright ("Request too large"). Latency was 79–103s, nearly all rate-limit
   backoff. The model also emitted malformed GROQ and returned zero results.

**Final shape:** the model no longer writes GROQ. It (1) expands the phrase into
keyword stems, then (3) keeps and scores candidates. The server runs a fixed,
parameterized query in between and pre-ranks by which field matched. The MCP
still supplies the cached schema overview that grounds stem generation.

Result: 4–7.5s per search (was 79–103s), and the model cannot emit a malformed
or hostile query at all.

A GROQ semantic found while testing, now recorded in the Context document: a
**parameterized** array in `match` is AND, while an **inline array literal** is
OR. `title match $stems` with four stems returned 1 lesson; the explicit OR form
returned 40.

## Key architectural decision: the LLM ranks, the server hydrates

**The LLM never supplies display data.** It returns only lesson `_id`s with a
rank and a match reason. The server then re-fetches every display field
(title, course, module, thumbnail, duration, key points) with a trusted GROQ
query and drops any `_id` that does not resolve.

Why this is non-negotiable here:

- AGENTS.md §7/§11 forbid inventing a course, lesson, timestamp or count.
  Hydration makes fabrication *structurally impossible* rather than merely
  discouraged.
- Finding 8 showed GROQ returns module *order* but not module *index*. Asking the
  model to count array positions to produce "Lesson 5.1" is exactly the arithmetic
  that yields wrong labels. Deriving it in TypeScript is deterministic and reuses
  the same rule as `sanity/lib/data.ts`.
- It bounds the response size: the model returns ids, not prose blobs.

---

## Files to create

**Search core**
- `lib/search/types.ts` — `SearchResult` union (`VideoResult` | `LessonResult`),
  `SearchResponse`, `SortOption`.
- `lib/search/schema.ts` — Zod schema for the model's structured output
  (`{ results: [{ lessonId, reason, relevance }] }`). Zod v4.
- `lib/search/prompt.ts` — the inline system prompt. Critical query/ranking
  rules live here *and* in the Context document (AGENTS.md §11/§12).
- `lib/search/mcp.ts` — `createMCPClient` HTTP transport + cached
  `/initial-context` fetch. Module-level cache; note in a comment that this
  means prompt edits need a server restart (AGENTS.md §12).
- `lib/search/hydrate.ts` — takes ranked ids → trusted GROQ fetch → derives
  module/lesson numbering → returns `SearchResult[]`.
- `lib/search/search.ts` — orchestrates: MCP tools → `generateObject` → hydrate
  → sort → count.

**Route + page**
- `app/api/search/route.ts` — POST handler. `runtime = "nodejs"`.
- `app/search/page.tsx` — server component; reads `?q=` and `?sort=`; renders
  results. `export const dynamic = "force-dynamic"`.
- `app/search/loading.tsx` — skeleton while streaming.

**Components**
- `components/search/search-header.tsx` — eyebrow, "Results for “q”", found line.
- `components/search/search-bar.tsx` — client; prefilled, resubmits to `/search`.
- `components/search/search-sort.tsx` — client; `Most Relevant` default, writes `?sort=`.
- `components/search/video-result-card.tsx` — thumbnail, duration, `VIDEO` badge,
  `Watch from 12:45` → `/lessons/<slug>?startSeconds=<n>`.
- `components/search/lesson-result-card.tsx` — key-points panel, `LESSON` badge,
  `View lesson`.
- `components/search/result-list.tsx` — dispatches on `kind`.
- `components/search/empty-state.tsx` — "Can't find what you're looking for?" +
  `Browse all courses` → `/courses`.

**Sanity**
- `sanity/lib/queries.ts` — add `SEARCH_HYDRATE_QUERY` (append; do not reorder).
- `sanity/lib/data.ts` — add `getLessonsForSearch(ids)`.
- `sanity/context/vertex-search.json` — the `sanity.agentContext` document
  (`groqFilter` + `instructions`) for import, since the Studio plugin path is
  unavailable (AGENTS.md §12).

**Config**
- `.env.example` — add `GROQ_API_KEY`, `SANITY_CONTEXT_MCP_URL`.
- `package.json` — add `ai`, `@ai-sdk/groq`, `@ai-sdk/mcp`, `zod`.

## Files to modify

- `components/site-header.tsx` — no change unless a search entry is required there.
- `app/search/page.tsx` is new; `hero-search.tsx` already points at it — leave it.

---

## Requirements

### Query behaviour (AGENTS.md §11)

- Token-based matching only. Wildcard every keyword (`fetch*`) and OR them in a
  `match` array. **Never** match a multi-word phrase as one pattern.
- Portable Text cannot be matched directly — use `pt::text(notes)`.
- Search lessons on `title`, `pt::text(notes)`, and `keyPoints[]`.
- Rank by specificity: an exact concept in the title beats a broad notes hit.
- Return **all** relevant results, not a fixed handful. Cap the model's id list
  at 40 for context safety and say so in the prompt.
- Empty state points to the full catalog.

### Grounding

- Every rendered field comes from the hydration query. An `_id` the model invents
  simply resolves to nothing and is dropped.
- Never show a `video` document as a result on its own (AGENTS.md §7).
- The result count reflects hydrated results, and the "across N courses" figure
  is computed from their distinct courses — never a model-supplied number.

### Boundaries (AGENTS.md §5/§12)

- The browser never sees `SANITY_API_READ_TOKEN` or `GROQ_API_KEY`, never calls
  the MCP or the LLM.
- All search work is server-side; the page is a server component and the client
  components handle only input and navigation.
- Search results are read-only; no writes anywhere in this feature.

### Analytics

- `hero-search.tsx` already fires `course_searched`. Add a `search_results_viewed`
  capture on the results page (query length, result count) — no raw query text
  beyond what is already captured, and no PII.

### UI

- `design/vertex-search.png` is the source of truth. Reuse `Badge` (`video` /
  `lesson` tones), `SearchInput`, `Select`, existing icons.
- Responsive down to mobile: result cards stack (media above text), the sort row
  wraps, the desktop layout stays exact.

---

## Security considerations

- Validate `q` server-side: trim, cap length (~200 chars), reject empty.
- The model's output is validated by Zod before use; ids are used only as GROQ
  **parameters** (`$ids`), never string-interpolated into a query.
- Rate-limit consideration: note that `/api/search` is unauthenticated and
  LLM-backed; keep the request bounded (max ids, max tokens) so a hostile caller
  cannot run up cost arbitrarily. Flag anything further as follow-up.
- Do not log the read token or the API key.

---

## Assumptions

1. `GROQ_API_KEY` will be supplied by the user; the route fails with a clear,
   non-leaking error if it is absent.
2. Model: a Groq-hosted model with reliable tool calling. Verify availability
   against the account's model list at implementation time and pin it in one
   place; do not scatter model ids.
3. The Context document is delivered as an importable JSON file — the dataset has
   zero `sanity.agentContext` docs today and the Studio plugin may lag (§12).
4. Video results render nothing until ingestion exists; the card and the union
   member are still implemented.

---

## Acceptance criteria

- [ ] `/search?q=data+fetching` renders ranked results matching the design.
- [ ] Result count and "across N courses" are both derived from hydrated data.
- [ ] Lesson labels ("Lesson 3.2 in Data Fetching and Caching") are derived
      positionally and are correct against the Studio.
- [ ] No `text::semanticSimilarity()` anywhere.
- [ ] Sort control changes order; `Most Relevant` is the default.
- [ ] Empty state shows for a nonsense query and links to `/courses`.
- [ ] No token or API key reaches the browser bundle.
- [ ] Video card component exists and is typed, dormant pending ingestion.

## Checks to run

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build` (new routes + server modules)
4. Live MCP verification of the final query shape.

## Manual test steps

1. `npm run dev`.
2. Home → type "data fetching" → Enter → lands on `/search?q=data%20fetching`.
3. Confirm the count line, the result cards, and the badges match the design.
4. Change the sort control; confirm order changes and the URL gains `?sort=`.
5. Click `View lesson` → correct lesson page.
6. Search "qwertyuiop" → empty state → `Browse all courses` → `/courses`.
7. DevTools → Network/Sources → confirm no Sanity token or Groq key present.
8. Narrow the viewport to 375px → cards stack, nothing overflows.

---

## Follow-up: automatic OpenRouter fallback

Added after the initial build, because Groq's 8,000 TPM free tier caps out
under normal use.

**Shape:** `lib/search/models.ts` builds an ordered model chain from whichever
provider keys are present, and `generateWithFailover` in `search.ts` walks it.

    groq:openai/gpt-oss-120b
      -> openrouter:z-ai/glm-5.2:free
      -> openrouter:nvidia/nemotron-3-super-120b-a12b:free
      -> openrouter:dots-studio/dots-3-note-preview:free

**Fallback is capacity-only.** `isCapacityError` matches 429/402/5xx and rate
limit, quota, "request too large", TPM, capacity and overloaded messages. A
schema or config error (like the earlier "json mode cannot be combined with
tool/function calling") is thrown immediately — retrying it on three more
models would just triple the latency of a guaranteed failure.

`maxRetries: 0` per model: the chain *is* the retry strategy, and the SDK's
default backoff would otherwise sit on a rate limit for ~45s before reaching a
model that has capacity.

**Model choice:** all three OpenRouter fallbacks were selected from the live
model list by filtering for `:free` plus `structured_outputs`, which both
pipeline steps require. Only 4 of 18 free models qualify. Override the list
with `OPENROUTER_SEARCH_MODELS`.

**Verified live** (key since supplied):

- Groq-first path: 3.8-6.3s, unchanged.
- OpenRouter-only path (Groq key blanked): returned 7 results across 3 courses
  in 32s — correct results, no Groq involved.
- **Real failover observed**, not simulated: the log recorded
  `[search] stems: openrouter/liquid/lfm-2.5-2.6b:free out of capacity, trying
  next`, the chain fell through to `dots-studio`, and the search still returned
  correct results.
- Capacity-error detection 8/8 against the real logged errors; chain-walk
  simulated across 5 scenarios; all 4 key combinations build correctly.

**Model list corrected by live testing.** Advertised `structured_outputs`
support turned out not to predict real behaviour — two of the three originally
chosen models fail every call (`z-ai/glm-5.2:free` "Provider returned error",
`nvidia/nemotron-3-super-120b-a12b:free` "Service temporarily overloaded"), and
`minimax/minimax-m3:free` returns prose instead of JSON. The list is now the two
models that passed 3/3.

**Bug found and fixed while testing.** `dots-studio` returns multi-word stems
("data fetch*") despite the prompt asking for single words. `normalizeStems`
stripped the space, producing "datafetch*", which matches nothing — a silent
zero-result search. It now splits on whitespace and drops stopwords, so
"data fetch*" becomes `data*`, `fetch*`.
