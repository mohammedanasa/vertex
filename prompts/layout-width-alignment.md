# Align page width across the app and audit responsiveness

## Goal

The lesson page's content shell is wider than the site header, so on a wide
screen the breadcrumb, title, and video start ~4rem to the left of the header's
logo. Align every page to one container width, and verify each page still
adapts correctly from desktop down to mobile.

## Skills / docs read

- `AGENTS.md` §3 (UI work: reproduce the reference exactly, responsive down to
  mobile, reuse existing patterns), §14.
- No new skill needed — this is a layout-only change with no data, schema, or
  server-boundary impact.

## Code inspected

- `components/site-header.tsx:20` — `mx-auto ... max-w-6xl px-6`
- `app/lessons/[slug]/page.tsx:91` — `mx-auto ... max-w-7xl` (the outlier)
- `components/lesson/lesson-nav.tsx:28` — `mx-auto ... max-w-7xl px-6`
- `app/courses/page.tsx:70` — `max-w-6xl px-6`
- `app/courses/[slug]/page.tsx:84` — `max-w-6xl px-6`
- `app/my-learning/page.tsx:35` — `max-w-6xl px-6`
- `app/page.tsx:60` — `max-w-6xl px-6` (feature section; hero is
  deliberately `max-w-3xl` and stays)
- `app/search/page.tsx:45`, `app/search/loading.tsx:14` — `max-w-4xl`
  (deliberately narrow, centered results column)
- `components/course/course-progress-bar.tsx:18` — `max-w-6xl px-6`

## Decisions and assumptions

1. **`max-w-6xl` (72rem) is the canonical page width.** It is already what the
   header and 4 of 5 content pages use. Widening the header to `max-w-7xl`
   instead would push the logo out of line with the catalog, course, and
   my-learning pages — one outlier would become four.

2. **Consequence, called out explicitly:** the lesson shell holds a `lg:w-80`
   sidebar *plus* the content column, whereas the header holds content only.
   Narrowing the shell from `7xl` to `6xl` therefore shrinks the lesson's
   reading/video column by 4rem at `lg`+ widths. This is the cost of the
   alignment that was asked for; the breadcrumb and title will sit directly
   under the logo. If the video feeling cramped matters more than the
   alignment, the alternative is to leave the shell at `7xl` and accept the
   offset — flag this in the report so the user can decide.

3. **Extract the width to one shared component** rather than repeating the
   literal in eight places, so this cannot drift again. New
   `components/ui/container.tsx` exporting a `Container` that renders
   `mx-auto w-full max-w-6xl px-6` plus any passed `className`, merged with the
   existing `cn` helper from `lib/utils`.

4. **Search stays `max-w-4xl`.** It is an intentionally narrow centered results
   column, not a misalignment. Same for the landing hero at `max-w-3xl` and the
   lesson body prose at `max-w-3xl`.

5. **No visual restyle.** Spacing, padding, type, and color are untouched. Only
   the max-width of the outlier containers changes.

## Files expected to change

- `components/ui/container.tsx` (new)
- `components/site-header.tsx`
- `app/lessons/[slug]/page.tsx`
- `components/lesson/lesson-nav.tsx`
- `app/courses/page.tsx`
- `app/courses/[slug]/page.tsx`
- `app/my-learning/page.tsx`
- `app/page.tsx` (feature section only)
- `components/course/course-progress-bar.tsx`

## Requirements

1. `Container` is a plain presentational component: no `"use client"`, accepts
   `className` and `children`, merges classes with `cn` so callers can add
   layout (`flex`, `py-*`, `lg:flex-row`) without fighting the base classes.
2. The lesson shell, the lesson bottom nav, and the header all resolve to the
   same computed max width, so the sidebar's left edge and the header's logo
   share a left edge at `lg`+.
3. The lesson bottom nav and the course progress bar are `sticky bottom-0`
   full-bleed bars whose *inner* row is constrained — keep the border and
   shadow full width, constrain only the inner row.
4. Nothing about the server/client boundary, data fetching, or analytics
   changes.

## Responsiveness audit (part of the task, not a follow-up)

Check each page at 375px, 768px, 1024px, and 1440px and fix anything that
breaks. Known things to verify:

- **Lesson page**: sidebar stacks above content below `lg`; the sticky
  `lg:h-screen lg:top-0` sidebar does not sit under the header at `lg`
  (the header is 5rem tall and is *outside* the sticky context — confirm the
  sidebar's sticky top is correct, and fix to `lg:top-20 lg:h-[calc(100vh-5rem)]`
  if the current `top-0`/`h-screen` overshoots).
- **Lesson bottom nav**: prev/next labels already collapse via `sm:` and the
  adjacent lesson titles hide below `md` — confirm nothing overflows at 375px.
- **Header**: the `Courses` / `My Learning` nav is `hidden sm:flex`, so below
  640px there is no way to navigate. Decide whether that is acceptable as-is
  (it matches no reference) and, if not, note it rather than inventing a mobile
  menu — AGENTS.md §3 forbids designing beyond the reference.
- **Catalog / my-learning grids**: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  — verify card content does not overflow at 375px.
- **Course detail**: `lg:grid-cols-2` hero stacks below `lg`.
- **Course filters / my-learning filters**: `max-w-56` / `max-w-48` selects sit
  in a row — verify they wrap rather than overflow at 375px.
- **Search**: centered column, verify at 375px.

Report any responsive issue found but *not* fixed, with the reason.

## Security considerations

None. This change touches presentational class names only. No tokens, no new
routes, no data access, no client/server boundary movement.

## Acceptance criteria

- On a 1440px viewport, the lesson page breadcrumb's left edge aligns with the
  header logo's left edge.
- Every content page shares one max width; `grep -rn "max-w-7xl" app components`
  returns nothing.
- No page scrolls horizontally at 375px.
- Type check and lint pass; production build succeeds.

## Checks to run

```
npm run typecheck   # or tsc --noEmit, per package.json
npm run lint
npm run build
npm run dev         # manual pass at the four widths
```

## Manual test steps

1. `npm run dev`, open `/lessons/<any-slug>` at 1440px. Confirm the breadcrumb,
   `LESSON 1.1` badge, and title left-align with the `Vertex` logo above.
2. Confirm the sidebar's left edge also aligns with the logo.
3. Scroll to the bottom nav; confirm its `Previous Lesson` button aligns with
   the same left edge.
4. Visit `/`, `/courses`, `/courses/<slug>`, `/my-learning`, `/search?q=tokens`
   and confirm each content column shares that left edge with the logo.
5. Resize to 375px on each page. Confirm no horizontal scrollbar, the lesson
   sidebar sits above the video, and the bottom nav buttons still fit.
6. At 1024px confirm the lesson sidebar is sticky and does not hide under or
   overlap the header when scrolling.
