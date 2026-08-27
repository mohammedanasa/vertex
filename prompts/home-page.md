# Implementation Prompt — Vertex Home Page

## Goal

Turn `design/vertex-home.png` into the real home page at `/`, replacing the stock
create-next-app content in `app/page.tsx`. Static, presentational only: top nav, hero with
headline + CTA + search input, an "All Courses" preview grid of three course cards, and a closing
band. No Sanity, no Clerk, no PostHog, no search wiring, no real auth — those land in later tasks.

## Skills / docs read

- `AGENTS.md` — §3 (UI work: reproduce the reference exactly, responsive down to mobile, reuse
  existing components before adding new ones), §5 (pages are read-only, browser holds no token),
  §6 (stack), §11 (search is a full results page, not a widget — the home search bar only has to
  look right and route to `/search`, it must not implement search logic here), §13 (checks), §14.
- No page-building skill exists for plain static marketing/catalog pages; the Sanity/Clerk/agent
  skills in `.agents/skills` don't apply since no content or auth is wired up in this task.

## Code inspected

- `design/vertex-home.png` — the reference. Warm canvas background, thin bottom border under the
  nav, centered hero with an "INTELLIGENT LEARNING" eyebrow pill, a two-line Playfair Display
  headline, a body subhead, a primary CTA button, a search input with a `⌘K` chip below it, a
  divider, then "All Courses" heading + "View all courses →" link, a 3-up card grid using the
  existing `CourseCard` shape (dark logo tile, Playfair title, description, meta row), a centered
  "New courses and lessons added every week" line flanked by hairlines and a star icon, and a
  decorative orange bar-chart/skyline graphic bleeding off the bottom edge.
- `prompts/design-system.md` — prior prompt and its "Implementation notes" section documenting
  real deviations (max-width 1440px, section ratios, `min-w-0` fix, `cn()` extended for custom
  text-size tokens). Establishes the token names and component contracts I build against.
- `app/globals.css` — tokens already exist: `--color-canvas` (#FBF8F6 warm bg), `--color-surface`
  white, `primary-*`, `neutral-*`, `text-display-1/2`, `text-heading-1/2/3`, `text-body(-lg)`,
  `text-small`, radii, shadows. Nothing new needs adding here.
- `app/layout.tsx` — Inter + Playfair Display already wired as CSS vars; `<body>` is
  `min-h-full flex flex-col`. Home page content sits inside that as normal flow.
- `app/page.tsx` — currently the untouched stock Next.js landing page (confirmed unused by
  anything else — no imports of it found). This task replaces it entirely.
- `components/ui/card.tsx` — `CourseCard` already matches the design's course card shape exactly
  (dark square logo tile, Playfair `text-heading-3` title, Body description, divider, meta row
  with `BarChartIcon`/`ClockIcon`/`FolderIcon`). Reused as-is, unmodified.
- `components/ui/button.tsx` — `Button` variant `primary` size `lg` matches the CTA (orange pill,
  white text, trailing icon slot via `gap-2` — reference shows a trailing arrow).
- `components/ui/input.tsx` — `SearchInput` already renders exactly the hero search bar: leading
  search icon, `⌘ K` shortcut chip, 44px, 12px radius. Reused as-is.
- `components/ui/nav-link.tsx`, `components/ui/logo.tsx` — nav wordmark and link treatment already
  match the reference nav (Courses / My Learning, active state in Primary 500).
- `components/icons.tsx` — has `SearchIcon`, `ArrowRightIcon`, `StarIcon`, `BellIcon`,
  `ChevronRightIcon`, `BarChartIcon`/`ClockIcon`/`FolderIcon` for card meta. Nothing new needed for
  icons in this page except the avatar image, which is a plain `<img>`/`next/image` placeholder,
  not an icon.
- No `avatar` or top-nav shell component exists yet (design-system page never built full chrome —
  it's a standalone reference page without a real site nav). This page is the first to need a real
  site header, so a small `SiteHeader` becomes a new reusable piece.
- `package.json` — no new deps needed; `clsx`/`tailwind-merge` already present via `cn()`.

## Decisions and assumptions

1. **New `components/site-header.tsx`.** The top nav (logo, Courses/My Learning nav links, bell
   icon button, avatar) is generic chrome every future page (course, lesson, search, my-learning)
   will reuse, so it becomes its own component rather than being inlined in `app/page.tsx`. Nav
   links are static (`Courses` → `/courses`, `My Learning` → `/my-learning`); neither route exists
   yet, so they're plain hrefs, not wired to real data. This matches AGENTS.md §5 — pages are
   read-only display, and no auth exists yet to gate them.
2. **No real auth for the avatar/bell.** AGENTS.md §7 says auth is Clerk and gates only what a
   feature marks private; Clerk isn't installed yet. The avatar and bell in the reference are
   static presentational placeholders (a bell `<button>` with `BellIcon`, and a round avatar image)
   with no dropdown/notification logic — exactly the same "presentational only, no backend" pattern
   AGENTS.md §7 already sanctions for My Learning/notifications bell. I use a local placeholder
   avatar image (initials fallback via a colored circle + `UserIcon`, no external image URL, since
   I'm not allowed to fetch/guess a URL for the user's photo).
3. **Search input has no behavior.** Per AGENTS.md §11, real search is a separate results page and
   agent pipeline (not built yet). The home page's `SearchInput` is presentational: typing and
   pressing Enter (or clicking) can navigate to `/search?q=...` via a small client wrapper, since
   that's just routing, not search logic. If `/search` doesn't exist yet this will 404, which is
   expected/acceptable for this task — flagged in Needs your attention.
4. **"Explore Courses" CTA and "View all courses" link point to `/courses`.** That route doesn't
   exist yet either. Per AGENTS.md workflow this is fine: pages link to the catalog route that a
   later task builds; a 404 today is expected and called out to the user.
5. **Course card data is hardcoded placeholder content** matching exactly what's shown in the
   image (Next.js for Production / Docker Essentials / TypeScript Deep Dive, with their exact
   descriptions, levels, durations, module counts). No Sanity client exists yet (AGENTS.md §5/§9),
   so this is static data local to the page, clearly not a data-fetching concern — this is
   consistent with `design-system.md`'s precedent of hardcoded demo content.
6. **Logo tiles reproduce the reference glyphs as inline SVG/text**, not imported brand icons (no
   asset files for Next.js/Docker/TypeScript logos exist in `public/`, and pulling third-party
   brand marks isn't part of this task). I reproduce them visually: black tile with white "N"
   serif glyph, blue whale-ish Docker mark abstracted as a simple inline SVG shape, blue "TS"
   monogram tile — close visual match using text/simple shapes rather than exact brand SVGs, since
   exact logo assets aren't provided and guessing external logo URLs isn't allowed.
7. **Decorative bottom graphic (orange bar/skyline gradient bleeding off-screen)** is built as a
   pure CSS/SVG decorative element (a row of gradient bars, `aria-hidden`), not an image asset,
   keeping the page dependency-free and matching the flat vector look in the reference.
8. **New `Eyebrow`/pill component is NOT extracted separately** — the "INTELLIGENT LEARNING" pill
   is small and single-use on this page today; it's inlined as a `span` with existing tokens
   rather than adding a new shared primitive prematurely.
9. **Section is a client component only where it must be** (the search input needs an `onChange`/
   submit handler to route to `/search`); everything else (header, hero copy, cards, footer band)
   stays a server component. The router-based bit is isolated into a small
   `components/home/hero-search.tsx` client component so `app/page.tsx` itself stays a server
   component.
10. **Responsive per AGENTS.md §3**: nav collapses "My Learning" text-visible but stacks/truncates
    gracefully isn't specified in the (desktop-only) reference, so at mobile widths the nav keeps
    logo + nav links + icons on one row with horizontal scroll avoided by shrinking gaps first;
    hero text/CTA/search stack full-width and center; the 3-up course grid becomes 1-column below
    `sm` and 2-column at `sm`–`md` before 3-column at `lg`, consistent with how the design-system
    page handles its card rows.

## Files to touch

**Added**
- `components/site-header.tsx` — `SiteHeader` (logo, nav links, bell button, avatar placeholder).
- `components/home/hero-search.tsx` — `"use client"` wrapper around `SearchInput` that pushes to
  `/search?q=...` on submit/click.
- `components/home/decorative-bars.tsx` — the bottom gradient bar-chart decoration (`aria-hidden`
  SVG), extracted only because it's a nontrivial chunk of markup, not because it's reused elsewhere.

**Modified**
- `app/page.tsx` — replaced wholesale with the real Vertex home page.
- `app/layout.tsx` — metadata description tweak only if needed to match the app's real purpose
  (currently still describes the design system); otherwise left alone.

No changes to `app/globals.css`, tokens, or existing `components/ui/*` — everything needed already
exists there.

## Requirements

1. Reproduce `design/vertex-home.png` section by section: header, hero (eyebrow, headline, subhead,
   CTA, search), divider, "All Courses" row (heading + view-all link) with the 3-card grid, closing
   band (star + copy + hairlines), decorative bottom graphic.
2. Header: logo left, `Courses`/`My Learning` nav links centered/left-of-center per reference, bell
   icon button + avatar circle on the right, thin bottom border, sits on the canvas background
   (not a white bar) per the reference.
3. Hero copy, button label, and search placeholder text must match the reference exactly:
   "INTELLIGENT LEARNING", "Search your learning in plain English.", the subhead sentence,
   "Explore Courses", "Ask anything about your learning…".
4. Course cards use the existing `CourseCard` component unmodified, with the three courses' exact
   titles, descriptions, level/duration/module-count values from the image.
5. "View all courses" link uses `ArrowRightIcon` and Primary 500 text, matching other
   text-link patterns already in the design system.
6. Closing band: `StarIcon` outline, "New courses and lessons added every week." text, hairline
   rules on both sides, centered.
7. Fully responsive to 320px: header stays usable (wrap or shrink, no horizontal page scroll), hero
   stacks and centers, search bar stays full-width and tappable, card grid goes to 1 column, footer
   band stays centered and doesn't overflow.
8. No `any`, no unused exports, no `eslint-disable`.
9. All interactive elements (nav links, CTA, search input, view-all link, bell button) are
   keyboard-reachable with a visible focus ring (already provided globally by `:focus-visible` in
   `globals.css`).

## Security considerations

- No secrets, tokens, or network calls introduced. No form posts anywhere.
- The hero search bar only performs client-side navigation (`router.push`) to a local route with
  the query string user-typed text URL-encoded via `URLSearchParams`/`Link`— no raw string
  interpolation into a URL, avoiding any injection into the address bar construction.
- No `dangerouslySetInnerHTML`; all copy is static JSX text.
- Placeholder avatar is a local inline shape/initial, not a remote image URL, so no third-party
  image host is introduced and no `next.config.ts` `images.remotePatterns` change is needed.

## Acceptance criteria

- [ ] `/` renders and visually matches `design/vertex-home.png` at desktop width (≥1280px).
- [ ] Header, hero, search bar, All Courses grid (3 cards, exact copy), and closing band all present
      with matching copy and layout.
- [ ] Clicking/submitting the search bar navigates to `/search?q=<encoded text>`.
- [ ] "Explore Courses" and "View all courses" both link to `/courses`.
- [ ] Page is usable at 320px with no horizontal scroll; grid stacks to 1 column, hero centers.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.

## Checks to run

```
npx tsc --noEmit
npm run lint
npm run build
npm run dev     # then open /
```

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/`.
2. Compare side-by-side with `design/vertex-home.png` at ≥1280px: header, hero copy/spacing, CTA
   button, search bar with `⌘K` chip, the 3 course cards' copy and meta rows, the closing band, and
   the bottom decorative graphic.
3. Type a query into the search bar and press Enter — confirm it navigates to
   `/search?q=your+query` (a 404 there is expected since `/search` isn't built yet).
4. Click "Explore Courses" and "View all courses" — confirm both go to `/courses` (404 expected).
5. Tab through the page — logo, nav links, bell, avatar, CTA, search input, view-all link should
   all take focus with a visible ring in a sensible order.
6. Resize to 768px, 375px, and 320px — confirm the header doesn't overflow, hero stacks and
   centers, cards go to 1 column, and there is no horizontal page scrollbar at any width.

---

Once approved, I will build strictly to this prompt and report back with What I did / Test /
Needs your attention.
