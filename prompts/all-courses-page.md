# Implementation Prompt — All Courses Page

## Goal

Build a simple `/courses` catalog page: a grid of every course from Sanity, with a category
filter and a sort control. No design reference was given — "keep it simple" per your instruction,
so this reuses existing components as-is with no new visual design.

## Code inspected

- `components/ui/select.tsx` (`Select`), `components/ui/card.tsx` (`CourseCard`),
  `components/ui/pagination.tsx` (`Pagination`, already URL-`?page=`-based) — all fit this page
  directly, no new components needed.
- `sanity/lib/queries.ts` — `COURSES_QUERY` (now includes `moduleCount`/`totalDuration` from the
  course-page work) and `CATEGORIES_QUERY` already exist and fetch everything needed.
- `sanity/lib/data.ts` — `getCourses()` and `getCategories()` already use the `perspective: 'drafts'`
  fix so they authenticate against the private dataset correctly.
- `app/page.tsx` — the home page's course-card rendering block (image tile, title/summary,
  meta row) is the pattern to reuse here, not reinvent.
- No existing category-filter or sort UI elsewhere in the app to match; building the minimum.

## Decisions

1. **Server component, URL search params for filter/sort/page** (`?category=`, `?sort=`, `?page=`)
   — no client state, consistent with `Pagination`'s existing `hrefFor` contract and AGENTS.md's
   "pages are read-only" principle. Filtering/sorting happens in the GROQ query via params, not
   client-side JS.
2. **Sort options: "Most Recent" (default, `_createdAt desc`) and "Title A–Z"** — the only two
   orderings the current schema cleanly supports without inventing new fields (no popularity/
   rating score exists to sort by beyond the `popular` boolean, and AGENTS.md says ground
   everything in real data).
3. **Category filter via `Select`**, options built from `getCategories()`, "All Categories" as the
   unset value.
4. **Page size 9** (3x3 grid), matching the existing `sm:grid-cols-2 lg:grid-cols-3` pattern from
   the home page.
5. **Reuses the same card markup as the home page's All Courses grid** (image tile + title/summary
   + level/duration/modules meta row, linking to `/courses/[slug]`), not the design-system's
   logo-tile `CourseCard` (which expects a decorative logo prop, not a real cover image).
6. **No search box on this page** — the home page's search bar already routes to `/search`
   (not built yet); this page is the plain browsable catalog, not search results, per AGENTS.md
   §11 distinguishing search from catalog browsing.
7. Breadcrumb: none needed (this is a top-level nav destination, matches how `/` has none).

## Files to touch

**Added**
- `app/courses/page.tsx` — the catalog page (server component, reads `searchParams`).

**Modified**
- None — everything else needed already exists.

## Requirements

1. Heading ("All Courses"), category `Select`, sort `Select`, result grid, `Pagination`.
2. Query params: `?category=<slug>`, `?sort=recent|title`, `?page=<n>`; all optional, sensible
   defaults (all categories, most recent, page 1).
3. Empty state (no courses match the selected category) — simple centered text, no illustration.
4. Responsive: 1 column mobile, 2 at `sm`, 3 at `lg`, matching the home page grid.
5. No `any`, no unused exports.

## Checks to run

```
npx tsc --noEmit
npm run lint        # scoped to app/courses/page.tsx given the known full-project lint OOM
npm run build
```

## Manual test steps

1. Open `/courses` — confirm all 10 seeded courses render across 2 pages (9 + 1).
2. Change the category filter — confirm the grid narrows and the URL updates.
3. Change sort to "Title A–Z" — confirm alphabetical order.
4. Click page 2 — confirm the remaining course(s) show and pagination reflects the current page.
5. Combine a category filter that yields 0 results — confirm the empty state renders.

---

Once approved, I will build strictly to this prompt.
