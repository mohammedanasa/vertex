# Offline tooling

Scripts here run by hand, never in the request path (AGENTS.md §5).

## `ingest-videos.mjs`

Builds one `video` document per unique video URL in the dataset: the source's
chapter markers as a table of contents, and the transcript split into short
timestamped chunks (§8, §9).

```bash
npm run ingest:videos -- --dry-run --limit=3   # inspect, write nothing
npm run ingest:videos                          # full run
```

Flags: `--dry-run`, `--limit=N`, `--concurrency=N` (default 4).

Requires `SANITY_API_WRITE_TOKEN` in `.env.local` (an Editor token from
manage.sanity.io). It is server-only and used nowhere else — `--dry-run` works
with just the read token.

Re-running is idempotent: documents are written with `createOrReplace` under a
deterministic id (`video.<videoId>`).

### Where the data comes from

Two different sources per video, because neither has both halves:

| Data | Source |
|---|---|
| Chapters | The `/watch` page HTML (`macroMarkersListItemRenderer`) |
| Transcript | The InnerTube player endpoint's signed caption `baseUrl` |

**Do not "simplify" the transcript fetch to the caption URL on the watch page.**
YouTube returns HTTP 200 with a zero-byte body for those unsigned URLs, so
ingestion would silently produce zero chunks for every video. The InnerTube
player endpoint returns a signed URL that actually serves the captions.

### Expected shape of a run

Roughly 3 in 4 videos have chapters; the rest store an empty `chapters` array.
That is correct, not a bug — chapter labels are never synthesized, because §7
makes the transcript the fallback precisely so that chapter labels stay clean.
Every video must end up with a non-empty `chunks` array.

### Providers

YouTube only. §9 says a provider is not supported until both ingestion and
playback exist, and `lib/video.ts` handles playback for YouTube alone. A lesson
with a non-YouTube `videoUrl` is skipped and reported in the summary.
