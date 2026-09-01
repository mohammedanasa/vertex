# PostHog analytics for search, video, and progress intent

## Goal

Instrument the features built since the PostHog setup commit (`716a0f1`) — intelligent
search, the lesson page with video playback, and the video moment results — following
PostHog's Next.js App Router conventions.

Requested coverage: search performed with query, search result opened with result type,
video play, watch depth, resume used, lessons completed, plus anything else worth tracking.

## Skills and docs read

- `.claude/skills/integration-nextjs-app-router/SKILL.md` and `references/COMMANDMENTS.md`
  — event naming, property conventions, PII rules, the server-side flush rule, and the
  "capture in event handlers, not in useEffect reacting to state" rule.
- `AGENTS.md` §5 (server/client boundaries), §7 (instrument catalog and lesson views, a
  search performed, a video play and how far it is watched, a lesson completed), §12
  (public project key only in the browser), §13 (checks to run).

## Code inspected

- `instrumentation-client.ts` — client init, `api_host: "/ingest"`, `defaults: "2026-01-30"`.
- `lib/posthog-server.ts` — `getPostHogClient()` singleton, `flushAt: 1`, `flushInterval: 0`.
  Currently unused by any caller.
- `components/posthog-identifier.tsx` — Clerk `identify(user.id, { username })`, no `reset()`.
- Existing captures: `course_viewed`, `course_searched`, `course_filter_applied`,
  `course_continue_learning_clicked`, `course_bookmarked`, `module_expanded`,
  `lesson_clicked`, `module_list_show_all_clicked`, `search_results_viewed`,
  `lesson_viewed`, `lesson_tab_changed`, `lesson_bookmarked`, `lesson_resource_clicked`,
  `video_played`.
- `app/search/page.tsx` (server component, `force-dynamic`), `lib/search/search.ts`
  (`runSearch` — the real pipeline), `app/api/search/route.ts` (POST route).
- `components/lesson/lesson-video.tsx` — bare `<iframe>`, click-to-play, no player API.
- `components/search/{video,lesson}-result-card.tsx` — server components, plain `<Link>`.
- `components/course/course-progress-bar.tsx`, `components/lesson/lesson-sidebar.tsx` —
  `PLACEHOLDER_PROGRESS = 35`, placeholder check marks. No progress backend exists.

## Decisions and assumptions

Confirmed with the user before writing this prompt:

1. **Watch depth = wall-clock approximation.** No YouTube IFrame API. Elapsed time since
   play is measured against the lesson's authored duration. This counts paused and
   backgrounded time as watched, so depth overstates. Both the event name and a code
   comment must say the measure is approximate, and the property is named
   `approx_percent_watched` so a dashboard reader cannot mistake it for exact.
2. **Progress events are intent only.** No progress backend is built. `resume_used` fires
   on the Continue Learning affordances and on a search result that deep-links to an
   offset; `lesson_completed` fires when the wall-clock estimate crosses the completion
   threshold. No fake completion state is written or read.
3. **Search query text is captured.** *(Reversed after the first pass — the initial build
   sent `query_length` only, and the user could not see what people actually searched
   for.)* Every search event now carries a `query` property alongside `query_length`. What
   learners ask a course catalog is product feedback, not personal data in the way a name
   or an email is, and without it search analytics cannot answer its main question.
   The text goes through `normalizeQueryProperty()` — trimmed, whitespace-collapsed,
   lowercased, capped at 120 chars — so "React Hooks", "react hooks" and "react  hooks"
   aggregate as one row rather than three. `query_length` stays measured on the real query,
   so truncation never misreports how long a search was. Names, emails and the Clerk
   username remain excluded.

Further decisions:

4. **Naming.** PostHog convention is `object_verb`, snake_case, past tense. The existing
   code already follows this, so new events match it. Two existing names are wrong and are
   corrected as part of this work (see "Renames").
5. **Server-side where the action is server-side.** `runSearch` is where a search actually
   executes — the model calls, the GROQ query, the hydration. That is where
   `search_performed` is captured, via `posthog-node`, with the Clerk user id as
   `distinctId`. The existing client `course_searched` stays as the UI-intent signal.
6. **`await flush()` after every server capture.** Per the commandments, a Next.js route or
   server component is torn down per invocation, so an unflushed enqueued event is silently
   dropped. `getPostHogClient()` is a shared singleton, so the call is `flush()`, never
   `shutdown()`.
7. **Analytics must never break a page.** Every server capture is wrapped so a PostHog
   failure cannot fail a search or a render. `getPostHogClient()` already returns `null`
   when unconfigured; callers must handle that.
8. **Result-card clicks need a client boundary.** The cards are server components. Rather
   than converting them, add a small `"use client"` link wrapper so the cards stay server
   components and only the click handler ships to the browser.

## Renames

Two existing events are misnamed against the convention and against what they measure.
Rename them and update every call site:

- `course_searched` -> `search_submitted`. It fires on the search *input*, from both the
  home hero and the results-page bar, and searches lessons and video moments, not courses.
  Add a `source` property (`"hero"` / `"results_page"`), which is currently unknowable.
- `search_results_viewed` -> keep the name (it is correct), but add `sort` and
  `has_results` so the empty-result funnel step is queryable.

Note in the report that these renames break continuity with any existing PostHog data.

## Events to add

### Search (server-side, in `lib/search/search.ts`)

- `search_performed` — the authoritative search event, captured where the search actually
  runs. Properties: `query_length`, `result_count`, `course_count`, `video_result_count`,
  `lesson_result_count`, `sort`, `stem_count`, `duration_ms`, `has_results`, `source`
  (`"page"` / `"api"`). `distinctId` = Clerk user id, falling back to an anonymous id.
- `search_failed` — the pipeline caught an error or was unconfigured. Properties:
  `query_length`, `reason` (`"unconfigured"` / `"pipeline_error"`), `duration_ms`. This
  makes search reliability visible rather than showing up as a silent zero-result run.

`runSearch` needs a `source` argument so the page and the API route are distinguishable;
default it so existing callers keep working.

### Search results (client)

- `search_result_opened` — fires on a result card click. Properties: `result_type`
  (`"video"` / `"lesson"`), `result_position` (1-based rank in the rendered list),
  `lesson_slug`, `course_slug`, `start_seconds` (video only, null for lesson),
  `relevance`, `sort`. This is the requested "search results opened with result type".
- `search_sort_changed` — properties: `from_sort`, `to_sort`, `result_count`. Tells you
  whether the default relevance sort is trusted.
- `search_no_results` — properties: `query_length`, `sort`. The empty state is a distinct
  product failure and deserves its own event, not just a zero on another one.

### Video (client, `lesson-video.tsx`)

- `video_played` — already exists. Add `resumed_from_search` (whether `startSeconds > 0`),
  `lesson_label`, and `video_duration_seconds` so play can be segmented.
- `video_playback_progressed` — the wall-clock watch-depth event. Fires once per crossed
  milestone at 25 / 50 / 75 / 90 percent. Properties: `approx_percent_watched`,
  `approx_seconds_watched`, `video_duration_seconds`, `lesson_slug`, `course_slug`,
  `start_seconds`. Each milestone fires at most once per mount, tracked in a ref.
- `lesson_completed` — fires when the wall-clock estimate crosses 90% of the authored
  duration. Properties: `lesson_slug`, `course_slug`, `lesson_label`,
  `video_duration_seconds`, `completion_source: "video_watch_estimate"`, and
  `is_estimate: true`. The last two properties keep it honest: this is inferred from
  elapsed wall-clock, not from real playback or stored progress.

Implementation notes for the timer:
- A single `setInterval` (5s) started on play and cleared on unmount. This is a genuine
  external-system synchronization, so `useEffect` is correct here — but the timer must be
  set up in the effect, not the capture logic reacting to state.
- Guard on a known, positive `durationSeconds`; with no duration, fire play only and skip
  depth entirely rather than dividing by zero or guessing.
- Account for `startSeconds`: a learner deep-linked to 5:00 of a 6:00 video starts at 83%,
  so the baseline is `startSeconds`, not zero.
- The interval must be cleared on unmount to avoid a leak across client navigations.

### Resume intent (client)

- `resume_used` — properties: `source` (`"course_cta"` / `"course_progress_bar"` /
  `"search_video_result"` / `"lesson_nav"`), `course_slug`, `lesson_slug`,
  `start_seconds`. On the search video result this is the same click as
  `search_result_opened`; both fire, because one measures search and one measures resume.
  `course-progress-bar.tsx` is currently a server component with a plain `<Link>` and needs
  the same client wrapper as the result cards.
- `lesson_navigated` — Previous/Next in `lesson-nav.tsx`. Properties: `direction`,
  `from_lesson_slug`, `to_lesson_slug`. Sequential progression through a course is the
  clearest engagement signal the app has today.

### Identity

- `components/posthog-identifier.tsx` must call `posthog.reset()` on the signed-in ->
  signed-out transition, tracked with a ref. Per the commandments, `reset()` must never
  fire on an initially anonymous load, because that discards the anonymous id and its
  history. This is a real bug in the current file.
- `username` is currently sent as a person property. Keep person properties to the Clerk
  user id only, per the user's constraint. Remove `username`.

## Files expected to change

| File | Change |
| --- | --- |
| `lib/analytics/events.ts` | New. Event-name constants and shared property builders. |
| `lib/posthog-server.ts` | Add `captureServerEvent()` — resolves the Clerk id, captures, awaits `flush()`, never throws. |
| `lib/search/search.ts` | `search_performed` / `search_failed`; add `source` param; time the run. |
| `app/api/search/route.ts` | Pass `source: "api"`. |
| `app/search/page.tsx` | Pass `source: "page"`; pass `sort` into the trackers. |
| `components/search/search-view-tracker.tsx` | Add `sort`, `has_results`; add `search_no_results`. |
| `components/search/search-result-link.tsx` | New client wrapper firing `search_result_opened` (+ `resume_used` for video). |
| `components/search/{video,lesson}-result-card.tsx` | Use the wrapper; accept `position` and `sort`. |
| `components/search/result-list.tsx` | Thread `position` and `sort` through. |
| `components/search/search-sort.tsx` | `search_sort_changed`. |
| `components/search/search-bar.tsx`, `components/home/hero-search.tsx` | Rename to `search_submitted`, add `source`. |
| `components/lesson/lesson-video.tsx` | Watch-depth timer, milestone events, `lesson_completed`, enriched `video_played`. |
| `components/lesson/lesson-nav.tsx` | `lesson_navigated` (needs a client boundary). |
| `components/course/course-progress-bar.tsx` | `resume_used` (needs a client boundary). |
| `components/course/course-cta-buttons.tsx` | Add `resume_used` alongside the existing click event. |
| `components/posthog-identifier.tsx` | Add `reset()` on sign-out; drop `username`. |
| `app/lessons/[slug]/page.tsx` | Pass duration, label, course slug into video and nav. |

## Corrections made during implementation

Two defects in the watch-depth design were found by simulating the milestone
loop against realistic playback cases, and fixed:

1. **Deep links back-filled milestones.** A search result linking to 9:10 of a
   10:00 lesson started above every threshold, so the first tick fired 25, 50,
   75, 90 *and* `lesson_completed` after five seconds. Milestones already behind
   the start offset are now seeded as fired, so only milestones genuinely
   crossed while watching are reported. Without this, search moment links — a
   core feature — would have inflated completion counts.
2. **The fix then under-counted real completions.** With the milestones seeded,
   a learner who entered at 550s and watched to the end got no completion at
   all, because the 90 milestone was already behind them. Completion is now
   judged on position reached rather than on the milestone list, guarded by
   `MIN_WATCHED_FRACTION_FOR_COMPLETION` (10% of the lesson) so entering late
   and watching to the end counts, while opening at 95% and leaving does not.

Verified by simulation across six cases: full watch, deep link + immediate
leave, deep link + watch to end, mid-lesson deep link, quick bounce, and a
half-watch. Only the genuine completions emit `lesson_completed`.

## Requirements

- snake_case, `object_verb`, past tense, consistent property names across events
  (`lesson_slug`, `course_slug`, `result_count` — never a synonym in one place).
- Event names centralized as constants so a rename cannot drift between call sites.
- Server-side capture for the server-side action (`runSearch`), always with `await flush()`.
- No PII beyond the Clerk user id: no query text, no titles that echo user input, no email,
  no username. Course and lesson slugs are authored catalog content, not user data, and are
  safe.
- Analytics never breaks a page: unconfigured PostHog stays a silent no-op in production
  and a loud console error in development, matching the existing pattern.
- No new dependency. No YouTube IFrame API.
- The watch-depth approximation is labelled as approximate in the property name, the event
  payload (`is_estimate`), and a code comment.

## Security considerations

- `getPostHogClient()` reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`, which is public by design
  (AGENTS.md §12). No private PostHog API key is introduced.
- The Clerk user id is resolved server-side via `auth()` from `@clerk/nextjs/server`, never
  passed in from the browser, so a client cannot spoof another user's `distinctId`.
- `posthog-node` stays out of every client bundle; only `lib/posthog-server.ts` and
  `lib/search/search.ts` import it, and both are already `server-only`.
- No token, key, or raw query text reaches an event payload.

## Acceptance criteria

1. A search from the results page produces a server-side `search_performed` with real
   counts and a `duration_ms`, attributed to the Clerk user id when signed in.
2. A failed or unconfigured search produces `search_failed`, not a silent empty result.
3. Clicking a video result fires `search_result_opened` with `result_type: "video"`, its
   `result_position`, and its `start_seconds`, plus `resume_used`.
4. Clicking a lesson result fires `search_result_opened` with `result_type: "lesson"`.
5. Playing a lesson video fires `video_played`, then `video_playback_progressed` at 25 /
   50 / 75 / 90, each at most once, then `lesson_completed` at the 90% threshold.
6. Deep-linking to `?startSeconds=300` starts the depth baseline at 300s, not 0.
7. Signing out fires `posthog.reset()`; an anonymous first load does not.
8. No event payload contains query text, an email, or a username.
9. `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (server modules and a route change, so a build is required per §13)
- `npm run dev` and walk the manual test steps below with the PostHog debug panel open.

## Manual test steps

1. `npm run dev`, open `/?__posthog_debug=true`, sign in with Clerk.
2. Search from the home hero -> expect `search_submitted` with `source: "hero"`, then
   `search_performed` (server) and `search_results_viewed` in the PostHog activity feed.
3. Change the sort control -> expect `search_sort_changed` with `from_sort` and `to_sort`.
4. Search something with no matches -> expect `search_no_results`.
5. Click a video result -> expect `search_result_opened` (`result_type: "video"`, a
   `result_position`, a `start_seconds`) and `resume_used`.
6. On the lesson page, press play -> expect `video_played`. Leave it running and confirm
   `video_playback_progressed` fires at 25 / 50 / 75 / 90 exactly once each, then
   `lesson_completed`. (Use a short lesson, or temporarily lower the interval, to keep this
   quick.)
7. Navigate away mid-playback and confirm no further events fire (the interval is cleared).
8. Click Previous/Next -> expect `lesson_navigated` with the right `direction`.
9. Sign out -> confirm `reset()` in the debug console. Reload anonymously and confirm
   `reset()` does **not** fire again.
10. In the PostHog UI, confirm no event property contains the searched text.
