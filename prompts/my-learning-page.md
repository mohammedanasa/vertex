# Implementation Prompt — My Learning Page

## Goal

Build the `/my-learning` route: a signed-in learner's view of the courses they have started, each
with its completion status. The site header has linked to `/my-learning` since the Clerk work
(`components/site-header.tsx:16`) and the route does not exist — this fills that 404.

Per AGENTS.md §7, My Learning is a **presentational surface with no backend of its own**. It "may
read existing progress for display." There is no progress backend yet, so this task builds the page
and its components against a single, clearly-marked progress source that a later task can swap for
real stored progress without touching the page.

Scope confirmed with the user:
- **Presentational only.** No Sanity `progress` schema, no write route, no changes to the lesson or
  course pages.
- **Composed from the existing design system**, not from a reference image (none exists for this page).
- **"Subscribed" means started**: a course appears once the learner has progress on at least one of
  its lessons.

## Skills / docs read

- `AGENTS.md` — §2 (workflow), §3 (UI: no invented visual language, responsive down to mobile),
  §5 (server/client boundaries; pages are read-only, browser never writes), §7 (My Learning is
  presentational; progress keys off the Clerk user id; PostHog instrumentation), §8 (data model:
  a lesson does not store its parent course), §12 (private dataset, token stays server-side), §13 (checks).
- `node_modules/next/dist/docs/` — App Router route conventions and the `PageProps<"/route">` typing
  this codebase already uses (`app/courses/page.tsx:33`). Confirm the current `generateMetadata`
  and `searchParams` shapes there before writing, per the AGENTS.md warning that this Next.js
  version differs from training data.
- No Clerk skill needed: the auth pattern in use is already established in `components/site-header.tsx`
  and `proxy.ts`.

## Code inspected

**Progress today is a placeholder, not a backend:**
- `components/course/course-progress-bar.tsx:5` — `const PLACEHOLDER_PROGRESS = 35`, hardcoded.
- `components/course/course-resume-link.tsx` — its own doc comment states "there is no progress
  backend yet (AGENTS.md §7), so the destination is the course's first lesson rather than a stored
  position."
- `components/course/course-cta-buttons.tsx:27-29` — same note; resume is *intent*, not state.
- `studio/schemaTypes/index.ts` — schema is `course, lesson, instructor, category, video, module_,
  learningOutcome, resource`. There is **no `progress` document type** and no enrollment concept.
- No `app/api/progress/` route exists. `app/api/search/route.ts` is the only API route.

**Auth:**
- `proxy.ts` — `clerkMiddleware()` with no route protection; everything is public by default.
  (Note: this project uses `proxy.ts`, not `middleware.ts`.)
- `components/site-header.tsx` — uses `Show when="signed-in" / "signed-out"` from `@clerk/nextjs`,
  plus `SignInButton`/`SignUpButton mode="modal"` and `UserButton`.

**Data layer:**
- `sanity/lib/data.ts` — `server-only`, every call passes `perspective: 'drafts'` so the read token
  is actually attached to the private dataset. `getCourses()` returns the card projection.
- `sanity/lib/queries.ts:3-17` — `courseCardProjection` already yields `_id, title, slug, summary,
  coverImage, level, price, popular, studentCount, moduleCount, totalDuration, instructor, category`.
  `COURSE_BY_SLUG_QUERY` yields `modules[]{ _key, title, summary, lessons[]->{ _id, title, slug,
  duration, freePreview, thumbnail } }`.
- Note `courseCardProjection` has **no lesson-level data** — it has `moduleCount` and `totalDuration`
  but not the lesson list. Counting completed-vs-total lessons per course needs a lesson count.

**Existing primitives to reuse (do not add new ones):**
- `components/ui/card.tsx` — `Card` (white surface, `rounded-lg`, `border-neutral-200`, `p-5`).
- `components/ui/progress-bar.tsx` — `ProgressBar` with `value`, `label`, `showLabel`; clamps and
  rounds, has correct `role="progressbar"` + aria attributes.
- `components/ui/status.tsx` — `StatusIndicator` with `"in-progress" | "completed" | "now-playing" |
  "locked"`; already carries the exact label/icon/color pairs (`Completed` = `CheckCircleIcon` in
  `text-success-500`, `In Progress` = `SpinnerIcon` in `text-primary-500`).
- `components/ui/select.tsx` — `Select` (native, chevron overlay), as used by `CourseFilters`.
- `components/ui/button.tsx`, `components/ui/badge.tsx`, `components/ui/breadcrumbs.tsx`.
- `components/course/course-resume-link.tsx` — the client resume link that fires `RESUME_USED`.
- `lib/format.ts` — `formatDuration`, `formatCount`.
- `components/icons.tsx` — full set; `ClockIcon`, `FolderIcon`, `BarChartIcon`, `CheckCircleIcon`,
  `ArrowRightIcon`, `SearchIcon`, `TargetIcon` are all available.

**Layout convention** (from `app/courses/page.tsx`): `<div className="flex flex-1 flex-col">` →
`<SiteHeader />` → `<main className="flex-1">` → `<div className="mx-auto w-full max-w-6xl px-6 py-12">`,
`h1` as `font-display text-display-2 font-bold text-neutral-900`, card grid
`grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3`.

**Analytics:** `lib/analytics/events.ts` centralizes names; `ResumeSource` is a closed union
(`"course_cta" | "course_progress_bar" | "search_video_result" | "lesson_nav"`) — adding a My
Learning resume affordance requires extending it.

## Decisions and assumptions

1. **Progress lives behind one seam, `lib/progress.ts`.** A single server-only module exports the
   shape and the reader. The page never computes progress inline. Because there is no store yet, the
   reader derives a deterministic stub from the Clerk user id + course id, and its doc comment states
   plainly that it is a placeholder for the future progress document (AGENTS.md §7/§8) and names what
   replaces it. **Rationale:** the alternative — hardcoding another `35` in a second place — spreads
   the placeholder the codebase is already trying to contain. One seam means the later backend task
   edits one function.
   - Deterministic (hash of `userId + courseId`), not random, so the page does not reshuffle between
     a server render and a refresh, and so screenshots are stable.
2. **Completion status is per course, derived from completed lesson count vs total lesson count.**
   The status shown is `Completed` when every lesson is done, otherwise `In Progress`, reusing
   `StatusIndicator` rather than inventing new state labels. `Not started` courses are excluded from
   the page by definition ("subscribed = started").
3. **Total lesson count needs a new projection field.** `courseCardProjection` lacks it. Add
   `"lessonCount": count(modules[].lessons[])` to that shared projection rather than writing a
   separate query — it is cheap, and the catalog card may want it later. This does change
   `COURSES_QUERY`'s result type, so TypeGen must be re-run.
   - Also project the flat lesson slugs needed to build a resume href:
     `"lessonSlugs": modules[].lessons[]->slug.current`. Confirm this flattening behaves in GROQ
     against the real dataset before relying on it; fall back to a `modules[]{lessons[]->{...}}`
     shape if not.
4. **Signed-out learners get a sign-in prompt, not a redirect.** The page reads `auth()` from
   `@clerk/nextjs/server`; with no `userId` it renders an in-page empty state with a `SignInButton`.
   **Rationale:** `proxy.ts` protects nothing today, and AGENTS.md §7 says "keep browsing public and
   gate only what a feature marks as protected." Adding route protection to `proxy.ts` is a broader
   change than this presentational task warrants, and an in-page prompt is friendlier than a bounce.
   Flag to the user as a decision they may want to reverse.
5. **A filter control, not pagination.** A learner's started-courses list is small. Reuse `Select`
   with an `All / In progress / Completed` status filter, driven by a `?status=` search param and
   filtered server-side — exactly the `CourseFilters` pattern. No `Pagination`.
6. **New analytics: `MY_LEARNING_VIEWED`,** added to `ANALYTICS_EVENTS`, captured by a small client
   tracker component mirroring `components/course/course-view-tracker.tsx`. Extend `ResumeSource`
   with `"my_learning_card"` so the existing resume funnel picks up this surface. Do not invent
   events beyond these two touches.
7. **Resume target is the first lesson**, same limitation and same honest comment as
   `CourseResumeLink` already carries. Do not imply a stored position exists.
8. **Server component page.** Only the filter, the view tracker, and the resume link are client
   components. No token, no Sanity client, and no progress logic reaches the browser (§5).

## Files expected to touch

**New**
- `app/my-learning/page.tsx` — server component; auth check, data fetch, filter, grid, empty states.
- `components/my-learning/enrolled-course-card.tsx` — server component card: cover, title, status
  indicator, progress bar, lesson counts, meta row, resume link.
- `components/my-learning/my-learning-filters.tsx` — client; status `Select`.
- `components/my-learning/my-learning-view-tracker.tsx` — client; fires `MY_LEARNING_VIEWED`.
- `lib/progress.ts` — `server-only`; progress shape + the single placeholder reader.

**Modified**
- `sanity/lib/queries.ts` — add `lessonCount` (and lesson slugs) to `courseCardProjection`.
- `lib/analytics/events.ts` — add `MY_LEARNING_VIEWED`; extend `ResumeSource` with `"my_learning_card"`.
- `components/site-header.tsx` — pass `active` to the `NavLink`s so the current section highlights
  (`NavLink` already supports it and nothing sets it today). Small, in-scope, and this page is the
  first that makes the omission visible.

**Explicitly not touched**
- `studio/schemaTypes/**` — no `progress` document this task.
- `app/api/**` — no write route; the browser writes nothing.
- `components/course/course-progress-bar.tsx` and the lesson page — the placeholder there stays; a
  single later task replaces every placeholder at once.
- `proxy.ts` — no route protection added.

## Requirements

- `/my-learning` renders for a signed-in learner: heading, a count line ("3 courses in progress"),
  the status filter, and a responsive card grid.
- Each card shows: cover image (or the neutral-900 fallback block the catalog uses when
  `coverImage` is null), course title linking to `/courses/[slug]`, a `StatusIndicator`, a
  `ProgressBar` with the percent, an "X of Y lessons" line, the level/duration/modules meta row, and
  a Continue/Review resume link.
- Completed courses read "Review", in-progress read "Continue" — label only; both go to the same place.
- Three distinct empty states, all honest about what they mean:
  1. Signed out → prompt to sign in.
  2. Signed in, no started courses → point at `/courses` (AGENTS.md §11 uses the same
     "point to the full catalog" pattern for empty search).
  3. Filter matches nothing → say the filter is empty, offer to clear it.
- Responsive per §3: 3-up → 2-up → 1-up; the card's meta row wraps; no horizontal scroll at 320px.
- Reuse existing primitives and Tailwind tokens only. No new colors, radii, shadows, or fonts.
- `lib/progress.ts` carries a comment naming itself a placeholder and naming its replacement.
- Re-run TypeGen after the query change so the generated types match.

## Security considerations

- `lib/progress.ts` and `sanity/lib/data.ts` are `server-only`; the read token never reaches the
  browser (§12).
- The Clerk user id is read server-side via `auth()` and used only to derive display state. It is
  **not** passed to a client component as a prop and **not** attached to any analytics event as a
  property — PostHog already carries it as the distinct id (see the `lib/analytics/events.ts` header
  comment), and duplicating it into properties would contradict that.
- No user names or emails in event payloads.
- The page performs no writes; nothing in this task needs the write token.
- `?status=` is validated against the allowed set before use, never interpolated into GROQ. The one
  new query change adds a static `count()`, no parameters.

## Acceptance criteria

1. `/my-learning` returns 200 signed in and signed out — no 404, no crash, no redirect loop.
2. Signed out, the page shows the sign-in prompt and no course data.
3. Signed in, started courses render with a progress bar and a status indicator whose percentage and
   status agree with each other (100% ⇒ Completed; anything less ⇒ In Progress).
4. The status filter narrows the grid and survives a page reload via the URL.
5. Nothing in the browser bundle contains a Sanity token or the progress derivation.
6. The page looks native beside `/courses` — same shell widths, type scale, and card treatment.
7. Type check and lint pass; the production build succeeds (new route + query change).
8. No new placeholder percentage constants outside `lib/progress.ts`.

## Checks to run

From the repo root (this repo is a single web workspace at root, with `studio/` alongside):
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` — required: a route and server modules changed.
- `npm run typegen` — required: `courseCardProjection` changed.
- `npm run dev` for the manual pass below.

No Studio deploy and no MCP verification: this task touches no schema and no search.

## Manual test steps

1. `npm run dev`.
2. Visit `/my-learning` **signed out** → sign-in prompt, no course cards, header renders.
3. Sign in via the header → land back on `/my-learning`; started courses now render.
4. Confirm each card's percentage matches its "X of Y lessons" line, and that a 100% card shows the
   green `Completed` indicator while others show the orange `In Progress` one.
5. Set the filter to **Completed**, then **In Progress** → grid narrows; the URL carries `?status=`;
   reload keeps the selection.
6. Pick a filter with no matches → the filter-specific empty state, not the generic one.
7. Click **Continue** on a card → lands on that course's first lesson.
8. In PostHog, confirm `my_learning_viewed` fires once per page view and `resume_used` fires with
   `source: "my_learning_card"`.
9. Resize to 1440 / 768 / 375 → 3-up, 2-up, 1-up; no horizontal scroll at 375 or 320.
10. Click **My Learning** in the header → the nav item renders in Primary 500 as the active item.
11. View source / devtools network on `/my-learning` → no Sanity token, no `SANITY_API_*` value in
    the client payload.
