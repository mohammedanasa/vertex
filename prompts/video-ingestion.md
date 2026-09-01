# Video ingestion pipeline

Build the offline tooling that creates one `video` document per unique video
URL, holding a chapter table of contents and the transcript split into short
timestamped chunks (AGENTS.md §8, §9).

---

## Goal

Today the search pipeline can only return lesson results. Video results — a
lesson's video matched at a specific second — are structurally impossible
because there is no `video` schema type and zero video documents in the dataset.
This task lands the missing half: the schema type, the ingestion script, and the
120 imported documents.

Scope is **ingestion only** (confirmed with the user). Wiring video results into
the search route stays a separate, additive task. The existing search pipeline,
result types, and cards are not touched.

---

## Skills and docs read

- `AGENTS.md` §5 (offline tooling never runs in the request path), §7 (chapters
  first, transcript as fallback; playback stays on the site), §8 (the `video`
  document shape), §9 (ingestion is per provider; a provider is not supported
  until both ingestion and playback exist), §12 (never return whole transcripts
  to the model; tokens stay server-side), §13 (checks to run).
- `sanity-best-practices` — `defineType`/`defineField` schema conventions,
  TypeGen, and dataset import.

---

## Code inspected

| File | What it establishes |
|---|---|
| `studio/schemaTypes/index.ts` | Schema registry — the new type must be registered here. |
| `studio/schemaTypes/documents/lesson.ts` | House style: `defineType`/`defineField`, `@sanity/icons`, `validation` rules, `preview`. Lesson holds `videoUrl` (required, http/https). |
| `studio/structure.ts` | Desk structure lists Courses/Lessons/Instructors/Categories. |
| `lib/video.ts` | `parseYouTubeId()` already exists and is the canonical URL→id parser. YouTube is the only supported provider. |
| `lib/search/types.ts` | `VideoResult` documents itself as dormant "until the video ingestion pipeline exists". Its `startSeconds` is what chapters/chunks must feed. |
| `components/search/video-result-card.tsx` | Same dormancy note; card is already built. |
| `sanity/context/vertex-search.json` | Contains the line "`video` documents do not exist in this dataset yet". |
| `videos.json` | 120 entries keyed by lesson slug → `{id, title, channel, duration, query}`. |
| `seed.ndjson` | 120 lesson docs, ids shaped `lesson.<slug>`; every `videoUrl` is a YouTube watch URL. |
| `studio/package.json` | Has the `sanity` CLI (import) and `typegen`. |

### Verified against the live sources (not assumed)

I probed YouTube directly before writing this prompt:

| # | Check | Result |
|---|---|---|
| 1 | `videos.json` keys vs lesson slugs | ✅ 120/120 match exactly |
| 2 | Unique video ids | ✅ 120 unique, **zero duplicates** — 1 video doc per lesson |
| 3 | `/watch` page `timedtext` baseUrl | ❌ Returns **HTTP 200 with 0 bytes** — unsigned URLs are dead |
| 4 | InnerTube `ANDROID` client `/youtubei/v1/player` | ✅ Returns a signed `baseUrl` that yields **28KB of srv3 XML** |
| 5 | Transcript across 8 sampled videos | ✅ 8/8 returned 103–530 cues, correctly timestamped |
| 6 | Chapters via `macroMarkersListItemRenderer` on `/watch` | ✅ Parses cleanly (7–22 chapters) |
| 7 | Chapter availability across 20 spread samples | ⚠️ **15/20 have chapters, 5/20 have none** |
| 8 | `yt-dlp` / `youtube-transcript-api` installed | ❌ Neither available; no YouTube API key in env |

**Finding 3 is the load-bearing one.** The obvious approach — scrape
`captionTracks` off the watch page and fetch that URL — returns an empty body.
Captions must come from the InnerTube player endpoint, which returns a signed
URL. Do not "simplify" back to the watch-page URL; it silently yields zero cues.

**Finding 7 drives the no-chapter decision** (confirmed with the user): videos
without chapters store an **empty `chapters` array** and rely on transcript
chunks. Labels are never synthesized — AGENTS.md §7 already defines transcript
as the fallback, and inventing chapter labels would break the "chapter labels
are clean" assumption that two-stage timestamp resolution depends on.

---

## Decisions and assumptions

1. **YouTube only.** AGENTS.md §9: a provider is not supported until both
   ingestion and playback exist. `lib/video.ts` handles playback for YouTube
   alone, and all 120 videos are YouTube. Vimeo and Bunny get no ingestion path;
   a non-YouTube URL is skipped with a warning, not a crash.
2. **Document id is derived from the video id**, not the lesson slug: `video.<youtubeId>`.
   §8 says one document per unique video URL. YouTube ids can contain `-` and `_`,
   both legal in Sanity ids; the script still strips anything outside
   `[A-Za-z0-9._-]` per §9's "stripping any characters the datastore rejects".
   Deriving from the video id (not the lesson) is what makes the pipeline
   idempotent and correct if two lessons ever share a video.
3. **The script reads `videoUrl` from Sanity**, not from `videos.json`.
   `videos.json` is a build-time seed artifact; the dataset is the source of
   truth. The script queries lessons for their `videoUrl`, dedupes by parsed
   video id, and ingests each unique video once.
4. **Chunking targets ~30 seconds / ~400 characters.** Raw YouTube cues are
   ~2 seconds and ~40 characters each — far too granular to be a useful search
   unit and 150–530 of them per video. Consecutive cues are merged until either
   bound is hit, and each chunk keeps the **start second of its first cue** so
   the timestamp still seeks accurately. This keeps a 950s video at roughly 30
   chunks instead of 530.
5. **Transcripts are ASR** (`kind: "asr"`) for these videos. Manual tracks are
   preferred when present; ASR is accepted as the fallback since it is all that
   exists here.
6. **The script writes with a token and lives outside the request path** (§5).
   It is a standalone Node script run by hand, never imported by the app.
7. **Rate limiting.** 120 videos × 2 requests. Requests run with a small
   concurrency limit and a delay so the run does not look like an attack and
   does not get throttled mid-way.
8. **The run is resumable and idempotent.** Re-running replaces documents by id
   via `createOrReplace`, so a partial run is safe to repeat.

---

## Files to touch

**New**
- `studio/schemaTypes/documents/video.ts` — the `video` document type.
- `scripts/ingest-videos.mjs` — the offline ingestion script.
- `scripts/README.md` — how to run it, and the InnerTube caveat.

**Modified**
- `studio/schemaTypes/index.ts` — register `video`.
- `studio/structure.ts` — add a Videos list item, marked as pipeline-managed.
- `package.json` — add an `ingest:videos` script.
- `.env.example` — add `SANITY_API_WRITE_TOKEN` (server-only).
- `sanity/context/vertex-search.json` — replace the "video documents do not
  exist" line with an accurate description, and keep video documents **out of
  `groqFilter`** so they stay an internal lookup (§7).

**Deliberately NOT touched** — this is ingestion only:
- `lib/search/*`, `components/search/*`, `sanity/lib/queries.ts`.
  The dormancy comments in `types.ts` and `video-result-card.tsx` stay until the
  wiring task makes them false.

---

## Requirements

### Schema — `video` document

Per AGENTS.md §8, exactly:

| Field | Type | Notes |
|---|---|---|
| `videoId` | `string` | Provider id, e.g. `9602Yzvd7ik`. Required. |
| `url` | `url` | The canonical watch URL. Required. |
| `provider` | `string` | List: `youtube`, `vimeo`, `bunny`. Defaults to `youtube`. |
| `title` | `string` | Source title, for Studio legibility. |
| `duration` | `number` | Seconds. |
| `chapters` | `array` of `{startSeconds, label}` | The table of contents. **May be empty.** |
| `chunks` | `array` of `{startSeconds, text}` | Transcript in short timestamped pieces. |

- `startSeconds` on both: required, `min(0)`, integer.
- Never add a field holding the whole transcript in one string (§8, §12) — a
  query must not be able to pull the full transcript back.
- Mark the type `readOnly` in the Studio: it is pipeline-built, and hand-editing
  it would be silently overwritten on the next run.
- `preview` shows the title with chapter/chunk counts as subtitle.

### Ingestion script — `scripts/ingest-videos.mjs`

1. Read `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
   `SANITY_API_READ_TOKEN`, `SANITY_API_WRITE_TOKEN` from `.env.local`. Fail
   with a clear message if the write token is missing.
2. Fetch `*[_type == "lesson" && defined(videoUrl)]{_id, title, videoUrl}`.
3. Parse each `videoUrl` to a YouTube id using the **same logic as
   `lib/video.ts`**. Skip and warn on non-YouTube or unparseable URLs.
4. Dedupe by video id.
5. For each unique id:
   - **Chapters**: fetch the watch page, extract
     `macroMarkersListItemRenderer` entries, decode HTML/unicode escapes,
     dedupe by `startSeconds`, sort ascending. Empty array when absent.
   - **Transcript**: POST to the InnerTube player endpoint with the `ANDROID`
     client context, read
     `captions.playerCaptionsTracklistRenderer.captionTracks`, prefer a
     non-ASR English track, fall back to ASR, then fetch `baseUrl + "&fmt=srv3"`.
   - Parse srv3 `<p t="ms" d="ms">` elements, strip inner tags, decode entities,
     drop empty cues.
   - Merge cues into ~30s / ~400-char chunks, each keeping its first cue's start
     second.
   - `createOrReplace` a `video` document with id `video.<videoId>`.
6. Support `--dry-run` (fetch and report, write nothing) and `--limit=N`.
7. Print a per-video line and a final summary: ingested, skipped, failed, plus a
   count of videos with no chapters.
8. A single video's failure is logged and the run continues; it must not abort
   the remaining 119.

---

## Security considerations

- `SANITY_API_WRITE_TOKEN` is **server-only** and used only by this offline
  script (AGENTS.md §12). It is never referenced by app code, never prefixed
  `NEXT_PUBLIC_`, and `.env.local` stays gitignored. Only `.env.example` is
  committed, with an empty value.
- The script is not importable by the app and lives outside `app/` and `lib/`,
  so it can never be pulled into the request path (§5).
- Video documents stay **out of the Context document's `groqFilter`**. They are
  an internal lookup, never a search result on their own (§7).
- Transcript text is authored-adjacent third-party content. It is stored as
  plain strings, never as HTML, and never rendered as markup by this task.
- GROQ in the script uses parameters, not string interpolation.

---

## Acceptance criteria

1. `video` is registered and visible in the Studio, read-only.
2. `count(*[_type == "video"])` returns **120**.
3. Every video document has a non-empty `chunks` array.
4. Roughly 75% have a non-empty `chapters` array; the rest are empty, **not**
   synthesized.
5. No document holds a whole-transcript field.
6. Chunk `startSeconds` values are ascending and within the video's duration.
7. Re-running the script is idempotent — the count stays 120.
8. `--dry-run` writes nothing.
9. The Context document no longer claims video documents do not exist.
10. Search behaviour is unchanged (this task adds data, not query paths).

---

## Checks to run

- `npx tsc --noEmit` (web)
- `npm run lint` (web)
- `cd studio && npm run typegen` — regenerates `sanity.types.ts` with the new type
- `cd studio && npx sanity schema deploy` — required before the Context MCP sees it
- `npm run ingest:videos -- --dry-run --limit=3` first, then the full run
- Verify in the dataset with a GROQ count

A production build is not required: no routes, config, or server modules change.

---

## Manual test steps

1. `npm run ingest:videos -- --dry-run --limit=3` — reports 3 videos, chapter and
   chunk counts, writes nothing.
2. `npm run ingest:videos` — completes 120 videos, prints the summary.
3. In Studio → Videos, open `Next.js 15 Tutorial - 5 - Routing`: 7 chapters
   starting `0 → "Introduction to Next.js Routing"`, and ~20–30 chunks.
4. Open a chapterless video (`python-for-data-work-python-data-types`,
   id `MZZSMaEAC2g`): chapters empty, chunks populated.
5. In Vision, run `count(*[_type == "video"])` → `120`, and confirm
   `*[_type == "video" && count(chunks) == 0]` returns nothing.
6. Re-run the full ingest; the count stays 120.
7. Load `/search`, run a query, confirm lesson results still render as before.
