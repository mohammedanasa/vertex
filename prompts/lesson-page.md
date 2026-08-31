# Implementation Prompt — Vertex Lesson Page

## Goal

Build the lesson page at `/lessons/[slug]`, matching `design/vertex-lesson.png` exactly, wired to
the already-seeded Sanity content, with the lesson's video playing **on the page** via a YouTube
embed (never sending the learner out to YouTube).

Layout, left to right / top to bottom in the reference:

- Site header (existing `SiteHeader`).
- **Left sidebar** (sticky, own scroll): "← Back to course" link, a course tile (dark square course
  logo, course title, "35% complete" micro progress bar), then the module accordion — a
  "Module 5 of 12" collapsible header, and per-module rows with a numbered circle badge, module
  title and duration, a chevron. The **current** module is expanded and its number badge is filled
  Primary 500 (white number); its lessons render as a nested timeline: a dot per lesson, lesson
  title, duration, with the current lesson showing "Now playing" in Primary 500 and a filled
  primary play button on the right. Completed modules show a Primary 500 check-circle on the right.
- **Right column (main)**: breadcrumbs (All Courses > course > module > lesson), a `LESSON 5.1`
  badge, the lesson title in Playfair display, the lesson summary line, a meta row
  (duration / level / student count with icons), and a bookmark icon button floated top-right.
- The **video player**: 16:9 black rounded surface holding the YouTube iframe embed.
- A **tab row**: "Lesson Content" (active, Primary 500 with underline) and "Notes" (inactive).
- Under "Lesson Content": an "Overview" heading + paragraph, an "In this lesson you will:" list of
  check-circle bullets, a Pro Tip callout (light primary tint, lightbulb icon), and a "Resources"
  3-up grid of resource cards with an external-link icon.
- The "Notes" tab is presentational only (AGENTS.md §7): it renders a static empty/placeholder
  state, no persistence.
- A **sticky bottom bar**: "← Previous Lesson" tertiary button + previous lesson title/duration on
  the left, next lesson title/duration + "Next Lesson →" primary button on the right.

Progress ("35% complete", completed check marks, "Now playing") is **presentational only** for this
task. AGENTS.md §7 lists learner progress as its own feature with a Clerk-keyed server-route write
path; none of that exists yet (no `middleware.ts`, no progress document type, no server route).
This page must not invent a write path for it — it displays a placeholder value exactly as
`components/course/course-progress-bar.tsx` already does on the course page.

## Skills / docs read

- `AGENTS.md` — §3 (reproduce the reference exactly; responsive down to mobile, collapse the lesson
  sidebar; no restyling), §5 (pages are read-only; server-only Sanity client; browser holds no
  token; no client writes), §6 (stack: `next-sanity`, `@sanity/image-url`, `@portabletext/react`,
  Tailwind), §7 (playback stays on the site via a provider embed with the provider's own start
  parameter; do **not** build a custom player; `startSeconds` query param seeks the embed; progress
  and Notes are presentational-only surfaces), §8 (lesson field shape; lesson does not store its
  parent course — derive with a reverse reference; "Module 5"/"Lesson 5.1" are derived from array
  order, never stored), §9 (YouTube is a supported provider for playback), §12 (private dataset,
  token stays server-side), §13 (checks), §14.
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md` and
  `.../page.md` — confirmed for Next 16: `params` and `searchParams` are **Promises** and must be
  awaited, and `PageProps<"/lessons/[slug]">` is the typing helper (the repo already uses this
  helper on `app/courses/[slug]/page.tsx` and `app/courses/page.tsx`, so the convention holds).
- No dedicated skill covers this page; it is plain Next.js + Sanity reads, already conventionalised
  by `sanity/lib/queries.ts` / `sanity/lib/data.ts`. `sanity-best-practices` not reloaded — the
  in-repo `defineQuery` + `sanityFetch` pattern is followed directly.

## Code inspected

- `design/vertex-lesson.png` — the reference; every section above is read off it.
- `sanity/lib/queries.ts` — **`LESSON_BY_SLUG_QUERY` and `LESSON_SLUGS_QUERY` already exist** and
  were written for exactly this page: they project `videoUrl`, `thumbnail`, `duration`,
  `freePreview`, `studentCount`, `keyPoints`, `notes`, `proTip`, `resources[]`, plus the reverse-
  referenced parent `course` with its `modules[]` and dereferenced lessons. Gaps for this design:
  the course projection lacks `coverImage` (needed for the sidebar course tile), `level` (needed for
  the meta row — level lives on the course, not the lesson), the course `summary`, and the module
  `summary`; and the module lesson projection lacks `freePreview`/`thumbnail`. These get added.
- `sanity/lib/data.ts` — **`getLessonBySlug` already derives the module/lesson position** from the
  parent course's module array order and returns `moduleNumber`, `lessonNumber`, `moduleTitle` and a
  `label`. It currently drops the full `modules` array from its return value, so the sidebar cannot
  be built from it. It gets extended to also return the modules (with per-module durations and the
  flat previous/next lesson neighbours) rather than re-deriving that in the page.
- `app/courses/[slug]/page.tsx` — the sibling page; its structure (`generateStaticParams`,
  `generateMetadata`, `notFound()`, `SiteHeader` + `main` + sticky footer bar, `Breadcrumbs`,
  derived module durations) is the template this page follows.
- `seed.ndjson` / live dataset — 10 courses, 40 modules, 120 lessons, 122 resources, 730 Portable
  Text blocks. Verified directly: **every one of the 120 lessons has a
  `https://www.youtube.com/watch?v=<id>` `videoUrl`** — no Vimeo or Bunny URLs are seeded, so only
  the YouTube embed case is needed (AGENTS.md §9: a provider is not supported until both ingestion
  and playback exist; only YouTube playback is in scope here). A sample lesson has `duration: 350`
  (seconds, number), `freePreview: true`, `studentCount: 18240`, 3 `keyPoints`, a `proTip` string,
  1 `resource` (`type: "link"`), and 6 `notes` blocks using `normal`/`h2` styles.
- `components/ui/` — `Breadcrumbs` (chevron trail, current page Neutral 900), `Badge`
  (`tone="video"` = `bg-primary-100 text-primary-500`, the exact `LESSON 5.1` pill treatment),
  `Button` (`primary`/`tertiary` match Next/Previous Lesson), `ProgressBar` (matches the sidebar
  micro bar; `showLabel` already supported), `Card` (base for the resource tiles).
- `components/course/module-list.tsx` — the course page's accordion. **Not reusable here**: it is a
  flat marketing accordion with a "Show all N modules" expander and no current-lesson/now-playing/
  completed states, and it renders module rows in a card, not a sidebar rail. A new
  `lesson-sidebar.tsx` is written instead, reusing its visual vocabulary (numbered circle badge,
  connector line, chevron, `formatDuration`).
- `components/course/course-view-tracker.tsx` — the established PostHog capture-on-mount pattern;
  copied for `lesson_viewed`.
- `components/icons.tsx` — has `ChevronLeftIcon`, `ChevronDownIcon`, `ArrowRightIcon`,
  `CheckCircleIcon`, `PlayCircleFilledIcon`, `BookmarkIcon`, `ExternalLinkIcon`, `ClockIcon`,
  `BarChartIcon`, `UsersIcon`, `DocumentIcon`, `CodeBracketIcon`. **Missing: a lightbulb** for the
  Pro Tip callout — one gets added in the same hand-drawn-stroke style as its neighbours.
- `app/globals.css` — all tokens exist (`primary-*`, `neutral-*`, `success-500`, `canvas`,
  `surface`, the named text sizes, radii, shadows). No new tokens needed.
- `lib/format.ts` — `formatDuration` ("1h 28m") and `formatCount` ("3.4k") already match the meta
  row format in the reference.
- `package.json` / `node_modules` — `@portabletext/react@6.2.0` is present but only **transitively**
  (via Sanity); it is not a declared dependency. `@tailwindcss/typography` is **not installed**.
- `next.config.ts` — `images.remotePatterns` already allows `cdn.sanity.io`. `img.youtube.com` is
  **not** allowed, so YouTube-hosted poster images cannot go through `next/image`; the seeded Sanity
  `thumbnail` is used instead, which needs no config change.

## Decisions and assumptions

1. **YouTube `<iframe>` embed, no custom player.** Per AGENTS.md §7 the provider's own player is
   used. `https://www.youtube-nocookie.com/embed/<id>?start=<seconds>&rel=0` renders in a 16:9
   container. The reference's player chrome (scrubber, 1x, CC, gear, fullscreen) is YouTube's own
   chrome, so it is not recreated in markup — recreating it would mean building a custom player,
   which §7 forbids. A `?t=` / `?startSeconds=` query param seeks the embed via YouTube's native
   `start` parameter, which is what the search feature will link into later.
2. **Video ID parsing is a shared helper** (`lib/video.ts`) handling `watch?v=`, `youtu.be/`, and
   `/embed/` forms, returning `null` for anything unrecognised. If it returns `null` the page shows
   the Sanity `thumbnail` as a static poster instead of a broken iframe — no Vimeo/Bunny code is
   written, since neither is seeded and §9 forbids claiming a provider without ingestion + playback.
3. **The video block is a client component** so the play/seek interaction and the PostHog
   `video_played` capture can live together. It renders the Sanity thumbnail as a click-to-play
   poster and swaps in the iframe with `autoplay=1` on click, which also avoids 120 pages each
   loading a YouTube iframe on mount. `startSeconds` in the URL skips straight to the iframe.
4. **`@portabletext/react` is promoted to a declared dependency** at its already-installed 6.2.0.
   Relying on a transitive hoist is fragile. Notes render through `PortableText` with explicit
   Tailwind-styled block/mark components (no `@tailwindcss/typography` — it isn't installed, and
   AGENTS.md §3 says reuse existing patterns before adding new ones).
5. **The "Overview" paragraph** comes from the lesson's `notes` Portable Text, which is the lesson's
   rich text body (the seeded blocks begin with exactly such an intro paragraph). The line under the
   title in the reference is the same content in short form; the **course** `summary` is not used
   there. To avoid inventing a field, the sub-title line renders the first plain-text paragraph of
   `notes`, truncated by line clamp, and the Overview section renders the full `notes` body.
6. **Level** is read from the parent `course.level` — the reference shows "Intermediate" in the
   lesson meta row and lesson documents have no level field.
7. **"Module 5 of 12" and "Lesson 5.1"** are derived from array indices (AGENTS.md §8), never
   stored. The sidebar opens the module containing the current lesson.
8. **Previous/Next** are the flat neighbours across the whole course (module boundaries crossed), so
   the last lesson of module 4 is the "Previous" of the first lesson of module 5 — which is what the
   reference shows ("Server Components" ← current module-5 lesson → "Authentication").
9. **The Notes tab and the bookmark button are inert** (AGENTS.md §7 lists both as presentational).
   The tab switch is local `useState`; the bookmark is a styled button with an `aria-label` and no
   handler beyond a PostHog capture.
10. **The sidebar is sticky on desktop and collapses on mobile** into a disclosure above the main
    content (AGENTS.md §3 explicitly calls for collapsing the lesson sidebar on mobile).

## Files expected to touch

Created:

- `app/lessons/[slug]/page.tsx` — server component; fetch, derive, compose.
- `components/lesson/lesson-sidebar.tsx` — client; course tile + module/lesson accordion rail.
- `components/lesson/lesson-video.tsx` — client; poster → YouTube iframe, seek, `video_played`.
- `components/lesson/lesson-tabs.tsx` — client; Lesson Content / Notes switch.
- `components/lesson/lesson-notes.tsx` — `PortableText` components for the notes body.
- `components/lesson/lesson-resources.tsx` — the 3-up resource card grid.
- `components/lesson/lesson-nav.tsx` — sticky previous/next footer bar.
- `components/lesson/lesson-view-tracker.tsx` — `lesson_viewed` capture on mount.
- `lib/video.ts` — `parseVideoId` / `buildEmbedUrl`, plus a plain-text extractor for Portable Text.

Modified:

- `sanity/lib/queries.ts` — extend `LESSON_BY_SLUG_QUERY`'s course projection (`coverImage`,
  `level`, module `summary`, lesson `freePreview`/`thumbnail`).
- `sanity/lib/data.ts` — extend `getLessonBySlug` to also return the course modules, per-module
  durations, and previous/next neighbours.
- `components/icons.tsx` — add `LightbulbIcon`.
- `package.json` — add `@portabletext/react` as a direct dependency.

## Requirements

1. Route `/lessons/[slug]` with `generateStaticParams` from `getLessonSlugs()` and
   `generateMetadata` (title `"<lesson> — <course> — Vertex"`), `notFound()` when the slug misses.
2. All content comes from Sanity. No hardcoded course, lesson, duration, count, or timestamp.
3. `params` and `searchParams` are awaited (Next 16); typed with `PageProps<"/lessons/[slug]">`.
4. `?t=<seconds>` (accepting `startSeconds` as an alias) starts the embed at that second via
   YouTube's `start` parameter. Invalid/negative values are ignored, not clamped into a crash.
5. The video plays inline. No link, button, or fallback sends the learner to youtube.com.
6. Derived numbering only: module index + 1, lesson index + 1, `Module N of M`, `LESSON N.M`.
7. Sidebar: current module expanded, current lesson marked "Now playing", modules before the current
   one shown with the completed check (placeholder progress), each module row showing its summed
   lesson duration. Every lesson row links to its own `/lessons/<slug>`.
8. Sticky bottom bar with real previous/next lesson titles and durations; the button is disabled
   (not a dead link) at the first/last lesson of the course.
9. Responsive: two-column ≥1024px with a sticky sidebar; below that the sidebar collapses to a
   disclosure above the content and the resource grid reflows 3 → 2 → 1.
10. PostHog captures: `lesson_viewed` on mount, `video_played` (with `start_seconds`),
    `lesson_tab_changed`, `lesson_resource_clicked`, `lesson_bookmarked`.
11. No new Tailwind tokens; use the existing scale in `app/globals.css`.

## Security considerations

- The Sanity read token stays server-side. The page fetches through `sanity/lib/data.ts`, which is
  `import 'server-only'`; no client component receives a token, a client, or a raw query.
- Nothing on this page writes. No progress, bookmark, or note is persisted — so no write token and
  no server route are introduced, and the browser-never-writes rule holds trivially.
- Resource `url` values are author-supplied. External links render with
  `target="_blank" rel="noopener noreferrer"`, and only `http(s)` URLs are rendered as links.
- Portable Text `link` annotations get the same `rel` treatment; `javascript:` hrefs are dropped.
- The iframe is `youtube-nocookie.com` with an explicit `allow` list (no `allow-same-origin` games,
  no `allowfullscreen` beyond what the player needs) and a `title` for screen readers.
- `videoUrl` is parsed to an ID and re-composed into a known-good embed URL rather than being
  injected into `src` as-is, so a malformed authored URL cannot redirect the frame elsewhere.

## Acceptance criteria

- `/lessons/<any seeded slug>` renders the full page from live Sanity data, visually matching
  `design/vertex-lesson.png` at desktop width.
- The video plays inline on click and never navigates away.
- `/lessons/<slug>?t=754` starts playback at 12:34.
- Sidebar shows the correct module expanded, correct "Module N of M", correct "LESSON N.M" badge,
  and "Now playing" on the current lesson.
- Previous/Next navigate to the true neighbours and are disabled at the course's ends.
- Notes tab switches and renders the Portable Text body; nothing is persisted.
- Page is usable at 375px wide with no horizontal scroll.
- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (routes and server modules change, so the build is required per AGENTS.md §13)
- `npm run dev` and load the page

Studio checks are not applicable: no schema change is made (only GROQ projections and frontend
code), so no schema deploy or re-import is needed.

## Manual test steps

1. `npm run dev`, open `/courses`, click any course, expand a module, click a lesson.
2. Confirm the lesson page shows the right course in the sidebar, the right module expanded, the
   right `LESSON N.M` badge, and "Now playing" on the lesson you clicked.
3. Click the video poster — it plays inline; confirm the address bar never leaves localhost.
4. Append `?t=754` and reload — the player starts at 12:34.
5. Click "Notes", confirm the tab switches and the placeholder shows; click back to Lesson Content.
6. Click "Next Lesson" repeatedly to the last lesson of the course — confirm it crosses module
   boundaries correctly and the button is disabled at the end. Same backwards with "Previous".
7. Click a resource card — it opens in a new tab.
8. Resize to 375px — the sidebar collapses above the content, resources stack, nothing scrolls
   horizontally.
9. In PostHog, confirm `lesson_viewed` and `video_played` arrive with the expected properties.
