# Implementation Prompt — Vertex Course Detail Page

## Goal

Build the course detail page at `/courses/[slug]`, matching `design/vertex-course.png` exactly,
wired to live Sanity content (project `6xdciolp`, dataset `production`, already seeded with 10
courses / 120 lessons / 5 instructors / 6 categories). Sections: breadcrumbs, hero (cover image,
POPULAR badge, title, summary, meta row, Continue Learning + Bookmark actions), "What you'll
learn" 2x2 outcome grid, "Course Content" module/lesson accordion list with a "Show all N modules"
expander, and a sticky bottom progress bar with a Continue Learning CTA.

Progress ("35% complete", Continue Learning) is presentational only for this task — no progress
tracking/Clerk-gated writes exist yet (AGENTS.md §7 lists progress as a later feature with its own
server route). This page only displays it as a stored-looking value; no real progress state is
read or written.

## Skills / docs read

- `AGENTS.md` — §3 (reproduce reference exactly, responsive to mobile), §5 (pages are read-only,
  server-only Sanity client, browser holds no token), §6 (stack), §7 (progress is a future
  feature — this page must not invent a write path for it), §8 (course/module/lesson data shape:
  module numbers are derived from order, not stored; course doesn't store duration/module
  count — derive from modules/lessons), §13 (checks), §14.
- `sanity-best-practices` — not reloaded in full this turn; existing `sanity/lib` patterns in this
  repo (`sanityFetch`, `defineQuery`, GROQ projections) already establish the convention and are
  followed directly instead of re-deriving from the skill.
- No dedicated "course page" skill exists; this is plain Next.js + Sanity fetch, covered by
  existing project conventions in `sanity/lib/queries.ts` and `sanity/lib/data.ts`.

## Code inspected

- `design/vertex-course.png` — the reference. Breadcrumb row (All Courses > Next.js for
  Production). Two-column hero: dark cover image tile left, POPULAR badge + Playfair title +
  summary + meta row (level/duration/modules/students with icons) + Continue Learning (primary,
  arrow icon) / Bookmark (tertiary, bookmark icon) buttons right. "What you'll learn" card
  containing a bordered 2x2 grid of outcome tiles (icon in a light-orange circle, title, 2-line
  description). "Course Content" section: header row with "12 modules · 18h 24m" on the right,
  then a numbered list (circle badge 1–6 shown, connected by a vertical line) of module rows —
  title, one-line summary, right-aligned duration + chevron-down — a "Show all 12 modules"
  expander button centered below, and a sticky bottom bar (white, top border, shadow) with "Your
  Progress" label + "35% complete" + a progress bar on the left, Continue Learning button on the
  right.
- `studio/schemaTypes/documents/course.ts`, `lesson.ts`, `instructor.ts` and
  `objects/module.ts`, `learningOutcome.ts`, `resource.ts` — current schema shapes.
- Live Sanity data (queried directly against the CDN endpoint with the read token in
  `.env.local`): confirmed 10 courses / 120 lessons / 5 instructors / 6 categories are already
  imported (commit `6f0cd6a`, `seed.ndjson`). Found a real mismatch: **every lesson document has
  `thumbnail`, not `poster`, and `duration` is a number in seconds (e.g. `950`), not the string
  schema currently declares.** Confirmed via `count(*[_type=="lesson" && defined(poster)])` → 0,
  `defined(thumbnail)` → 120. Per your decision, this prompt fixes the schema to match reality
  (§ Requirements item 1) rather than re-seeding or patching around it in the query layer.
  `learningOutcome.icon` is a free-text identifier (`layers`, `workflow`, `gauge`, `rocket`,
  `code`, `puzzle`, `shield`, `sparkles` — the full set found across all 10 seeded courses), which
  the frontend maps to a real icon component.
- `sanity/lib/queries.ts`, `data.ts` — `COURSE_BY_SLUG_QUERY` and `getCourseBySlug` already fetch
  everything the page needs at the right shape (course + learningOutcomes + instructor + category
  + modules with dereferenced lessons), except lesson `poster`/`duration` need the schema-name fix
  above to resolve correctly, and the query needs `videoUrl`-free lesson fields only (duration is
  enough; no per-lesson video needed on this page — that's the lesson page's job).
  `COURSE_SLUGS_QUERY` exists for static params.
- `sanity/lib/image.ts` — `urlFor()` ready to use; no existing `next.config.ts` `images.remotePatterns`
  entry for `cdn.sanity.io`, so `next/image` will 400 until that's added.
- `components/ui/card.tsx` — `Card` primitive reused for outcome tiles and module rows.
  `CourseCard`/`LessonVideoCard`/`LessonCard`/`ResourceCard` are shaped for the catalog/search
  pages, not this page's hero or module-accordion layout — not reused directly here, but their
  `Card` base and `MetaItem`-style meta row pattern is followed for visual consistency.
- `components/ui/badge.tsx` — `Badge tone="popular"` matches the POPULAR pill exactly.
- `components/ui/button.tsx` — `primary`/`tertiary` variants match Continue Learning/Bookmark.
- `components/ui/progress-bar.tsx` — `ProgressBar` matches the sticky footer bar exactly
  (value + "complete" label already the default).
- `components/ui/breadcrumbs.tsx` — `Breadcrumbs` matches the top trail exactly.
- `components/icons.tsx` — has `BarChartIcon`, `ClockIcon`, `FolderIcon`-equivalent (`FolderIcon`
  exists), `UserIcon`, `BookmarkIcon`, `ArrowRightIcon`, `ChevronDownIcon`. Missing the 8 outcome
  icons (`layers`, `workflow`, `gauge`, `rocket`, `code`, `puzzle`, `shield`, `sparkles`) and a
  students-count icon (reference uses a two-person "students" glyph, distinct from `UserIcon`'s
  single figure) — both added in this task, following the existing 24x24/2px-stroke outline
  convention.
- `components/site-header.tsx` — already the real header (logo, nav, bell, Clerk sign-in/up or
  `UserButton`), reused unmodified at the top of this page.
- No `app/courses/` route exists yet at all — this task creates the first one, so `/courses` (the
  catalog/listing page linked from breadcrumbs) does not exist either; the "All Courses"
  breadcrumb link will 404 until that page is built, called out below.
- `app/globals.css` — tokens (`primary-100` for the icon-circle background, `neutral-*`,
  `radius-lg`, `shadow-sm`) all already exist; nothing new needed.
- `next.config.ts` — currently empty (`{}`), needs `images.remotePatterns` for
  `cdn.sanity.io` to allow `next/image` to load Sanity assets.

## Decisions and assumptions

1. **Fix the schema, not the data or the query layer** (per your decision): in
   `studio/schemaTypes/documents/lesson.ts`, rename `poster` → `thumbnail` (same image type,
   required) and change `duration` from `string` to `number` (seconds, `rule.required().min(0)`,
   description updated to "Duration in seconds"). Update `sanity/lib/queries.ts` to select
   `thumbnail` instead of `poster` everywhere it appears (`COURSE_BY_SLUG_QUERY`'s module lessons
   projection, `LESSON_BY_SLUG_QUERY`). Re-run `npm run typegen` (from `studio/`) after the schema
   edit so `sanity.types.ts` regenerates with the corrected `Lesson` shape. Deploy the schema
   (`sanity deploy` from `studio/`, per AGENTS.md §12/§13 — the Context MCP needs a deployed
   Studio, and this keeps Studio authoring consistent with what's live) — flagged in Needs your
   attention since I won't run a deploy without you confirming.
2. **Format seconds as duration strings in a small helper**, `lib/format.ts`:
   `formatDuration(seconds)` → `"5m 50s"`/`"1h 12m"` style for module/lesson rows, and
   `formatDuration` composed with a sum for the course total ("18h 24m"). No new dependency —
   plain arithmetic.
3. **Course-level duration, module count, and lesson count are derived, not stored** (AGENTS.md
   §8: "The numbers shown in the UI... are derived from order, not stored" extends naturally to
   aggregate counts — course schema has no `duration`/`moduleCount` field and shouldn't gain one).
   Computed server-side in the page from `course.modules` (`modules.length`) and by summing every
   lesson's `duration` across all modules.
4. **Module numbering (`1`, `2`, `3`...) comes from array order**, per AGENTS.md §8, not a stored
   field — `modules.map((m, i) => ...)`.
5. **"Show all N modules" is a real expand/collapse, not a route.** The reference shows exactly 6
   of the course's 12 modules with the rest hidden behind a "Show all 12 modules" button. This
   needs client interaction (`useState` toggle), so the module list becomes a small
   `"use client"` component (`components/course/module-list.tsx`) receiving the already-fetched
   module data as props; the rest of the page stays server-rendered. Collapsed state shows the
   first 6 modules (or all of them if the course has ≤6); expanding reveals the rest and the
   button switches to "Show fewer modules" (not shown in the static reference, but required for a
   working, non-one-way toggle — a small, obvious completion of the interaction the reference
   only shows one state of).
6. **Module accordion chevron is decorative-only for this task.** The reference shows a
   chevron-down per module row but no expanded/lesson-list state in the image. Since AGENTS.md §3
   says reproduce the reference exactly and nothing beyond it, and the lesson list per module is
   already reachable via the lesson page navigation this task doesn't build yet, I render the
   chevron as a static icon (not a working per-row accordion toggle) rather than inventing an
   unspecified expanded state. Flagged in Needs your attention as a reasonable scope call.
7. **Continue Learning / Bookmark buttons are presentational**, matching AGENTS.md §7's framing of
   progress as a later feature: `Continue Learning` is a `Link` styled as the primary button,
   pointing to the first lesson of the course (`/lessons/[slug]` route, which doesn't exist yet —
   this is a forward link, expected to 404 until that task lands, same pattern as the home-page
   prompt's `/courses` link). `Bookmark` is a plain `<button>` with no click handler yet (no
   bookmark data model exists in AGENTS.md §8) — static, per AGENTS.md §7's "presentational only,
   no backend of their own" carve-out precedent (free preview badge, notifications bell).
8. **Progress value is hardcoded at 35%** to match the reference exactly, since no progress
   tracking exists yet (AGENTS.md §7: progress lands as a later task with its own server route
   and Clerk-keyed data). This is static placeholder content, consistent with how the home page
   prompt hardcoded course cards before Sanity was wired in — flagged in Needs your attention.
9. **Sticky bottom bar uses `sticky bottom-0`**, not `fixed`, so it stays within normal document
   flow and doesn't require extra body padding accounting or overlap other fixed chrome; it sits
   below all page content and clings to the viewport bottom once content is taller than the
   viewport, matching the reference's persistent-footer behavior.
10. **Outcome icon mapping is a small `Record<string, IconComponent>` lookup** in the outcome-grid
    component, covering the 8 known identifiers found in the live data (`layers` → new
    `LayersIcon`, `workflow` → new `WorkflowIcon`, `gauge` → new `GaugeIcon`, `rocket` → new
    `RocketIcon`, `code` → new `CodeBracketIcon`, `puzzle` → new `PuzzleIcon`, `shield` → new
    `ShieldIcon`, `sparkles` → new `SparklesIcon`), with a safe fallback (e.g. `StarIcon`) for any
    future/unrecognized value so the page never crashes on new Studio content.
11. **New `UsersIcon`** (two overlapping figures) added to `components/icons.tsx` for the
    students-count meta item, since the existing `UserIcon` is a single figure and the reference's
    glyph reads as two people — distinguishing "students enrolled" from a generic person icon used
    elsewhere (e.g. avatar fallback).
12. **`generateStaticParams` from `COURSE_SLUGS_QUERY`** for the `[slug]` route, and a `notFound()`
    call when `getCourseBySlug` returns null, consistent with how `getLessonBySlug`/
    `getInstructorBySlug` are already written to return `null`/derived shapes for missing data.
13. **Metadata**: `generateMetadata` using the course's title/summary, following the pattern
    Next.js App Router expects for dynamic routes (not covered by the reference image but required
    for a real page — minimal, no OG image logic beyond the existing cover image).
14. **`next.config.ts` gains `images.remotePatterns`** for `cdn.sanity.io` only (the actual asset
    host `urlFor()` resolves to) — the minimal change needed for `next/image` to render Sanity
    images anywhere in the app, not just this page.

## Files to touch

**Added**
- `app/courses/[slug]/page.tsx` — the course detail page (server component), data fetch +
  `notFound()` + `generateStaticParams` + `generateMetadata`.
- `components/course/outcome-grid.tsx` — "What you'll learn" 2x2 card grid (server component).
- `components/course/module-list.tsx` — `"use client"` Course Content module list with the
  show-all/show-fewer toggle.
- `components/course/course-progress-bar.tsx` — sticky bottom progress bar + CTA (server
  component; static content, no client state needed since it's non-interactive besides the link).
- `lib/format.ts` — `formatDuration(seconds: number): string` helper.

**Modified**
- `studio/schemaTypes/documents/lesson.ts` — `poster` → `thumbnail`, `duration` string → number.
- `sanity/lib/queries.ts` — update field name from `poster` to `thumbnail` in
  `COURSE_BY_SLUG_QUERY` and `LESSON_BY_SLUG_QUERY`; no other query shape changes needed since
  `COURSE_BY_SLUG_QUERY` already selects everything else this page needs.
- `components/icons.tsx` — add `LayersIcon`, `WorkflowIcon`, `GaugeIcon`, `RocketIcon`,
  `CodeBracketIcon`, `PuzzleIcon`, `ShieldIcon`, `SparklesIcon`, `UsersIcon`.
- `next.config.ts` — add `images.remotePatterns` for `cdn.sanity.io`.
- `sanity.types.ts` — regenerated by `npm run typegen`, not hand-edited.

## Requirements

1. Fix the lesson schema/query mismatch (poster→thumbnail, duration string→number) before
   building the page, so real data renders correctly instead of against stale field names.
2. Breadcrumbs: "All Courses" (→ `/courses`, expected 404 for now) `>` course title (current page,
   not a link), using the existing `Breadcrumbs` component.
3. Hero: cover image in a dark rounded tile (use `next/image` with `urlFor`, `fill`, matching the
   reference's roughly-square proportions), POPULAR badge shown only `if (course.popular)`,
   Playfair Display title, summary paragraph, meta row (level capitalized, formatted total
   duration, `${modules.length} modules`, formatted student count e.g. "2.1k students" for
   `studentCount`), Continue Learning + Bookmark buttons.
4. "What you'll learn" section renders only if `learningOutcomes` is non-empty; 2-column grid on
   desktop collapsing to 1 column on mobile, each tile bordered with icon-in-circle, title,
   description, inside an outer bordered card matching the reference's nested-card look.
5. "Course Content": header row (heading + "N modules · Xh Ym" derived summary), numbered module
   rows with a connecting vertical line between numbered circles, title + one-line summary, total
   module duration (sum of its lessons) + chevron-down icon, "Show all N modules" /
   "Show fewer modules" toggle button matching the reference's outlined pill style, only shown if
   there are more than 6 modules.
6. Sticky bottom bar: "Your Progress" label, "35% complete" + `ProgressBar` at the hardcoded 35%
   value, Continue Learning button (arrow icon), matching the reference's white/bordered/shadowed
   treatment, stays pinned to the bottom of the viewport when content is taller than the screen.
7. All copy is real, live Sanity content for the given slug — no hardcoded course/lesson content
   anywhere on this page.
8. Fully responsive to 320px: hero stacks to a single column (image above text), meta row wraps,
   outcome grid goes to 1 column, module rows stay legible without horizontal scroll, sticky
   footer stacks progress-info above the button if needed to avoid overflow.
9. No `any`, no unused exports, no `eslint-disable`.
10. All interactive elements keyboard-reachable with visible focus rings (existing global
    `:focus-visible` styling).

## Security considerations

- No secrets introduced. The Sanity read token stays server-only via the existing `sanityFetch`/
  `client` (`server-only` import already enforced in `sanity/lib/client.ts` and `data.ts`).
- `next/image` with an explicit `remotePatterns` allowlist (only `cdn.sanity.io`), not a wildcard,
  so no arbitrary remote image host is enabled.
- No `dangerouslySetInnerHTML` — all rendered text is plain JSX from typed Sanity fields (no
  Portable Text is rendered on this page; `notes`/`proTip` are lesson-page concerns).
- Course slug comes from the URL param and is passed straight into a parameterized GROQ query
  (`$slug`), not string-interpolated — consistent with existing `getCourseBySlug`.

## Acceptance criteria

- [ ] `studio/schemaTypes/documents/lesson.ts` updated; `npm run typegen` (from `studio/`) run and
      `sanity.types.ts` reflects `thumbnail`/numeric `duration`.
- [ ] `/courses/nextjs-app-router-in-depth` (and the other 9 seeded course slugs) render real
      content matching `design/vertex-course.png`'s layout at desktop width (≥1280px).
- [ ] Cover image, all lesson/module data, learning outcomes, instructor-independent fields all
      come from live Sanity — verified by checking a second course slug renders different content.
- [ ] POPULAR badge appears only on courses with `popular: true`.
- [ ] Total duration, module count, and per-module duration are correctly summed from lesson data
      (spot-check one course's numbers against a manual sum).
- [ ] "Show all N modules" reveals the rest of the modules and toggles to "Show fewer modules";
      button is absent entirely for a course with ≤6 modules.
- [ ] Sticky footer bar shows 35% and pins to viewport bottom on a long page.
- [ ] A non-existent slug (`/courses/does-not-exist`) renders the Next.js `not-found` page (404).
- [ ] Page is usable at 320px with no horizontal scroll.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.

## Checks to run

```
# from studio/
npm run typegen

# from repo root
npx tsc --noEmit
npm run lint
npm run build
npm run dev     # then open /courses/nextjs-app-router-in-depth
```

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/courses/nextjs-app-router-in-depth`.
2. Compare side-by-side with `design/vertex-course.png` at ≥1280px: breadcrumbs, hero layout and
   copy, meta row values, What you'll learn grid (icons + copy), Course Content list (numbering,
   summaries, durations, connecting line), Show all modules button, sticky footer bar and its 35%
   value.
3. Click "Show all 12 modules" — confirm the remaining modules appear and the button switches to
   "Show fewer modules"; click again to collapse.
4. Open a second course, e.g. `/courses/practical-web-security`, and confirm different real
   content renders (different title, outcomes, modules, lesson counts/durations).
5. Open `/courses/does-not-exist` — confirm the Next.js not-found page renders (404 status).
6. Scroll a long course's page — confirm the bottom progress bar stays pinned to the viewport.
7. Resize to 768px, 375px, 320px — confirm hero stacks, outcome grid goes to 1 column, module rows
   don't overflow, and the sticky footer doesn't overflow or clip its button.
8. Tab through the page — breadcrumb link, Continue Learning, Bookmark, Show all modules toggle,
   and the footer Continue Learning button should all take focus with a visible ring.

---

Once approved, I will build strictly to this prompt and report back with What I did / Test /
Needs your attention.
