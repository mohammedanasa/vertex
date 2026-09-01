# Search page: wire video moment results to Sanity content

## Goal

Make the search results page render what the design shows. The page, both card
components, the sort control, the count line and the empty state already exist
and already match `design/vertex-search.png`. The gap is the **result mix**: the
design is dominated by `VIDEO` cards ("Watch from 12:45"), and today the
pipeline can only ever emit `kind: "lesson"`.

`lib/search/types.ts` and `components/search/video-result-card.tsx` both document
the video card as dormant "until the video ingestion pipeline exists". That
premise is now stale — the pipeline has run.

## Verified state of the world (checked, not assumed)

Live query against project `6xdciolp` / dataset `production`:

| Fact | Value |
|---|---|
| `video` documents | 120 |
| ...with `chunks` | 120 |
| ...with `chapters` | 79 |
| `lesson` documents | 120 |
| Lesson → video join | `lesson.videoUrl == video.url` (exact match, confirmed) |

So every lesson's video has a transcript, and ~2 in 3 have clean chapter labels.
Both stages of §7's two-stage resolution are actually available.

## Code inspected

- `app/search/page.tsx` — server component, count line, sort, empty state. Matches design.
- `components/search/video-result-card.tsx` / `lesson-result-card.tsx` / `result-meta.tsx` — both card layouts already built to the design.
- `lib/search/search.ts` — 4-step pipeline: stems → fixed GROQ → model rank → re-hydrate.
- `lib/search/hydrate.ts` — hardcodes `kind: "lesson"` for every row.
- `sanity/lib/queries.ts` — `LESSON_SEARCH_QUERY`, `SEARCH_HYDRATE_QUERY`.
- `lib/video.ts` — `buildYouTubeEmbedUrl({startSeconds})`, `parseStartSeconds`, `formatTimestamp`.
- `app/lessons/[slug]/page.tsx:70-71` — already reads `?t=` / `?startSeconds=` and seeks the embed.

## The GROQ idiom (verified against the live dataset)

This was the one genuinely non-obvious part, so it was tested before being written down.

A **parameterized** array in `match` is AND; an inline literal is OR. To OR a
parameter list you count matching stems. The operand order matters and is easy
to get backwards:

```groq
// WRONG — returns [] silently, no error
chapters[count($stems[@ match ^.label]) > 0]

// RIGHT — verified
chapters[count($stems[^.label match @]) > 0]
```

Spot-check with stems `["data*","fetch*","cach*"]`: 15 videos match on chapter
label, 93 on transcript text. The full lesson-joined query returns real lessons
with real timestamps.

## Decisions and assumptions

1. **Chapters first, transcript as fallback** (§7). Per video: if any chapter
   label matches, use chapter moments and do not look at chunks. Only when no
   chapter matches does the transcript supply the moment. Chapter labels are
   clean; transcript text is the noisier backstop.
2. **Cap moments per video.** At most 2 per video, so one heavily-matching
   video cannot crowd out the whole page. §12's "never return a whole chunks
   array to the model" is respected — the moment query is server-side and its
   output never reaches the model at all.
3. **The model's role does not change.** It still only emits lesson ids +
   relevance. Timestamps are resolved by GROQ on the server, so a timestamp can
   never be hallucinated (§11). This is the key grounding property and it is
   preserved rather than loosened.
4. **A video result is always tied to its lesson** (§7). The join runs through
   `lesson.videoUrl`; a video with no owning lesson is dropped. Video documents
   are never surfaced on their own.
5. **Merge, don't replace.** A lesson can yield both a lesson result and a video
   moment, exactly as the design shows (both appear for "Data Fetching &
   Caching"). De-duplicate on `kind + lessonId`, not on `lessonId`.
6. **`clipSeconds`** = the lesson's own `duration`, which is what the design's
   bottom-right poster badge shows. Not invented.
7. **Ranking.** Video moments inherit the parent lesson's model relevance, with
   a small bonus for a chapter-label hit over a transcript hit (more specific,
   per §11's specificity rule).

## Files to touch

- `sanity/lib/queries.ts` — add `VIDEO_MOMENTS_QUERY`.
- `sanity/lib/data.ts` — add `getVideoMoments(lessonIds, stems)`.
- `lib/search/hydrate.ts` — emit both kinds; build video results from moments.
- `lib/search/search.ts` — call the moment query after ranking, merge, sort.
- `lib/search/types.ts` / `components/search/video-result-card.tsx` — drop the
  now-false "dormant" comments.
- `sanity/context/vertex-search.json` — record the verified `match` idiom.

Not touched: `app/search/page.tsx` and the card layouts. They already match the
design, and §3 says do not restyle beyond the reference.

## Security

- Every step stays server-side; `hydrate.ts` and `data.ts` are `server-only`.
- Read token never leaves the server; browser gets no token and calls no MCP/LLM.
- Stems remain a **bound parameter**. The model never authors GROQ.
- Model output is still vetted against the offered id set before hydration.

## Acceptance criteria

1. `/search?q=data+fetching` renders both VIDEO and LESSON cards.
2. Every "Watch from MM:SS" links to `/lessons/<slug>?startSeconds=N` and the
   embed actually starts there.
3. Timestamps trace to a real `chapters[].startSeconds` or `chunks[].startSeconds`.
4. Chapter matches win over transcript matches for the same video.
5. Count line reflects merged results; sort control still works.
6. Zero-result query still shows the empty state.
7. No video document is ever rendered as a standalone result.

## Checks

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (server modules changed)
- Live verification of the moment query against the real dataset.

## Manual test

1. `npm run dev`, go to `/search?q=data+fetching`.
2. Confirm a mix of VIDEO and LESSON cards.
3. Click "Watch from MM:SS" → lesson page, video starts at that second.
4. Confirm the timestamp matches a real chapter/chunk in the Studio.
5. Switch sort to "Shortest First" — order changes, count does not.
6. Search gibberish (`q=zzzqqq`) → empty state with "Browse all courses".
