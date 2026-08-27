# Implementation Prompt — Vertex Design System

## Goal

Turn `design/vertex-designsystem.png` into the real, reusable foundation for the Vertex web app:
Tailwind v4 design tokens, the two brand fonts, an icon set, and the component primitives every
later page (home, course, lesson, search) will be built from. Ship a `/design-system` route that
reproduces the reference image so the tokens and components can be verified visually against it.

This is foundation work only. No Sanity, no Clerk, no PostHog, no search, no data fetching.

## Skills / docs read

- `AGENTS.md` — sections 3 (UI work: reproduce the reference exactly, make it responsive),
  5 (workspace boundaries), 6 (stack: Tailwind + typography), 13 (checks), 14.
- `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` — `next/font/google`,
  CSS-variable pattern applied on the root layout. Next 16.3.2 + React 19.2.8, App Router.
- No design-system skill exists in `agent/skills/` (only the three Sanity/agent skills), so no
  skill applies to this task.

## Code inspected

- `package.json` — Next 16.3.2, React 19.2.8, Tailwind v4 via `@tailwindcss/postcss`. No UI deps yet.
- `app/globals.css` — stock create-next-app: `@import "tailwindcss"` + a stub `@theme inline` with
  Geist variables and a `prefers-color-scheme: dark` block. All of this gets replaced.
- `app/layout.tsx` — stock, loads Geist/Geist_Mono, uses the Next 16 `LayoutProps<"/">` type.
  Keep the `LayoutProps` signature; swap the fonts and metadata.
- `app/page.tsx` — stock create-next-app landing page. Left untouched by this task.
- `tsconfig.json` — `@/*` maps to the repo root, so imports are `@/components/...`, `@/lib/...`.
- The repo is currently a single Next.js workspace at the root, not yet split into `web/` +
  `studio/` per AGENTS.md §5. This task does not restructure the repo; it only adds to the
  existing app. The split stays a separate piece of work.

## Values read from the reference image

Every value below was read from `design/vertex-designsystem.png` (cropped and upscaled to read the
small type). The image's printed hex values are the source of truth for the palette.

**01 Colors**

| Token | Hex | | Token | Hex |
|---|---|---|---|---|
| Primary 500 | `#F97316` | | Neutral 900 | `#0F172A` |
| Primary 400 | `#FB923C` | | Neutral 700 | `#334155` |
| Primary 300 | `#FDBA74` | | Neutral 500 | `#64748B` |
| Primary 200 | `#FED7AA` | | Neutral 300 | `#CBD5E1` |
| Primary 100 | `#FFEEE5` | | Neutral 200 | `#E2E8F0` |
| | | | Neutral 100 | `#F1F5F9` |
| | | | Neutral 50 | `#FAFAFC` |
| | | | White | `#FFFFFF` |

**02/03 Typography** — Playfair Display (display) and Inter (UI).

| Style | Font | Size / line height | Weight | Use |
|---|---|---|---|---|
| Display 1 | Playfair Display | 48 / 56 | Bold | Page titles |
| Display 2 | Playfair Display | 36 / 44 | Bold | Section titles |
| Heading 1 | Inter | 28 / 36 | Semi Bold | Card titles |
| Heading 2 | Inter | 22 / 30 | Semi Bold | Sub section |
| Heading 3 | Inter | 18 / 26 | Medium | Small titles |
| Body Large | Inter | 16 / 24 | Regular | Body copy |
| Body | Inter | 14 / 20 | Regular | Supporting text |
| Small | Inter | 12 / 16 | Regular | Captions, meta |

**04 Spacing** — base unit 4px; scale 4, 8, 12, 16, 24, 32, 40, 48, 64. This is Tailwind's default
0.25rem base, so no override is needed — only documented on the page.

**05 Radius** — xs 4px, sm 8px, md 12px, lg 16px, xl 24px, full (circle).

**05 Shadows** — all `rgba(15, 23, 42, α)`:
- sm `0 1px 2px 0 / 0.05`
- md `0 4px 12px -2px / 0.08`
- lg `0 12px 24px -4px / 0.10`
- xl `0 20px 40px -8px / 0.12`

**06 Icons** — 24×24 grid, 2px stroke (outline), rounded line caps. Outline and filled variants of:
bell, search, play-circle, document, bookmark, bar-chart, clock, user, chevron-right.

**07 Buttons** — height 44px default, padding `0 16px` (lg) / `0 12px` (md), radius 12px,
Inter Medium 14–16px. Four variants × three states:
- Primary: solid Primary 500, hover darker (Primary 600 `#EA580C`), disabled Primary 100 bg + Primary 300 text.
- Secondary: white bg, 1px Primary 500 border, Primary 500 text; hover Primary 100 bg; disabled faded.
- Tertiary: white bg, 1px Neutral 200 border, Neutral 900 text, trailing external-link icon; hover shadow-sm; disabled Neutral 300 text.
- Text: bare Primary 500 text with a trailing play-circle icon; hover darker; disabled faded.

**08 Inputs** — height 44px, radius 12px, 1px solid `#E2E8F0`, padding `0 16px`, focus border
`#FB923C`. Search input: leading search icon, `⌘ K` chip on the right. Select: label text plus a
trailing chevron-down.

**09 Badges** — pill, uppercase, letter-spaced, 12px semibold:
- `VIDEO` and `POPULAR`: Primary 500 text on Primary 100 bg.
- `LESSON`: indigo text `#4F46E5` on `#E8EAF9` bg (an accent pair used only by lesson badges).

**10 Status indicators** — In Progress (orange partial-ring spinner), Completed (green `#22C55E`
outlined check circle), Now Playing (solid Primary 500 play circle), Locked (Neutral 900 padlock).

**11 Progress bar** — full-width track `#F1F5F9`, rounded-full Primary 500 fill, `35%` bold +
`complete` in Neutral 500 to the right.

**12 Cards** — four shapes, all white, radius 16px, 1px Neutral 200 border:
- Course card: square dark logo tile, Playfair title, Body description, thin divider, meta row (level / duration / modules) with icons.
- Lesson card (video): `VIDEO` badge, Heading title, description, footer with `Lesson 5.1 · 12:45` and a `Watch from 12:45` primary text action.
- Lesson card (lesson): `LESSON` badge, Playfair title, description, footer with `Module 5` and a `View lesson` action.
- Resource card: document icon, title + description, footer `PDF · 1.2 MB` and an external-link action.

**13 Navigation** — brand lockup (orange V mark + `Vertex` wordmark), nav links with the active one
in Primary 500; breadcrumbs separated by chevrons with the last crumb in Neutral 900; pagination
with prev/next chevrons, an active page in a Primary 500 outlined box, and an ellipsis gap.

**14 Principles** — four icon + title + description blocks: Clarity First, Consistency,
Focus & Calm, Accessible.

## Decisions and assumptions

1. **Warm canvas is a real token.** All four reference screens sit on a warm off-white, sampled at
   `#FAF7F5`–`#FCF8F6`, not on the printed Neutral 50 `#FAFAFC`. I take the printed palette as the
   token values and add one extra semantic token `--color-canvas: #FBF8F6` for the page background,
   with cards staying `#FFFFFF`. Flagged for the user in case Neutral 50 was meant to be the page bg.
2. **Tailwind v4, CSS-first.** All tokens go in `app/globals.css` under `@theme` (not `@theme inline`,
   which the stock file uses only to alias `:root` vars). No `tailwind.config.ts` is created.
3. **No dark mode.** The reference is light-only and AGENTS.md §3 says not to design beyond it. The
   stock `prefers-color-scheme: dark` block in `globals.css` is removed so the palette holds.
4. **Icons are hand-written inline SVG** in `components/icons.tsx` rather than a new icon dependency.
   The set is exactly what the reference shows plus the handful the cards and nav need
   (chevron-left/down, external-link, check-circle, lock, arrow-right, folder, eye, grid, target,
   accessibility, spinner). 24×24 viewBox, `currentColor`, 2px stroke, round caps/joins.
5. **Two small dependencies added:** `clsx` and `tailwind-merge`, behind a `cn()` helper in
   `lib/utils.ts`. Without merge semantics, a caller's `className` cannot reliably override a
   component's own utilities (Tailwind resolves by stylesheet order, not attribute order).
6. **Variants are plain string maps**, not `class-variance-authority` — the variant sets here are
   small and a third dependency is not earned.
7. **Everything is a server component** except the pieces that need state: the demo select and the
   `⌘ K` search input on the design-system page. Those carry `"use client"`.
8. **`/design-system` is a permanent internal route**, not a throwaway. It is the visual regression
   reference for later UI work and doubles as the acceptance check for this task.
9. **Fonts** load through `next/font/google` as CSS variables (`--font-inter`, `--font-playfair`) on
   `<html>`, wired into `@theme` as `--font-sans` and `--font-display`. Inter carries weights
   400/500/600/700; Playfair Display 700.
10. **Card components live in `components/ui/`** alongside the primitives. They are presentational
    and take explicit props — no data types are invented ahead of the Sanity schema; props are
    plain strings/numbers so the cards can be adapted when the real content model lands.

## Files to touch

**Modified**
- `app/globals.css` — replace wholesale with the Vertex `@theme` token set + base layer.
- `app/layout.tsx` — Inter + Playfair Display, `lang="en"`, canvas background, Vertex metadata.
- `package.json` / lockfile — add `clsx`, `tailwind-merge`.

**Added**
- `lib/utils.ts` — `cn()`.
- `components/icons.tsx` — the outline + filled icon set.
- `components/ui/logo.tsx` — `<Logo />` mark + wordmark lockup.
- `components/ui/button.tsx` — `Button` (variant: primary | secondary | tertiary | text; size: md | lg).
- `components/ui/badge.tsx` — `Badge` (tone: video | lesson | popular).
- `components/ui/input.tsx` — `Input`, `SearchInput` (client).
- `components/ui/select.tsx` — `Select` (client).
- `components/ui/progress-bar.tsx` — `ProgressBar`.
- `components/ui/status.tsx` — `StatusIndicator` (in-progress | completed | now-playing | locked).
- `components/ui/card.tsx` — `Card` shell + `CourseCard`, `LessonVideoCard`, `LessonCard`, `ResourceCard`.
- `components/ui/breadcrumbs.tsx` — `Breadcrumbs`.
- `components/ui/pagination.tsx` — `Pagination`.
- `components/ui/nav-link.tsx` — `NavLink` (active/inactive).
- `app/design-system/page.tsx` — the reference page, sections 01–14 in order.
- `app/design-system/_sections/*.tsx` — one file per section if the page file grows past ~400 lines.

## Requirements

1. Reproduce the reference image section by section, in the same order and the same grid: section 01
   spans the right two thirds of row 1 next to the title card; 02 and 03 share row 2; 04 and 05 share
   row 3; 06, 07, 08 share row 4; 09, 10, 11 share row 5; 12 spans full width; 13 and 14 span full width.
2. Each section is a white card with a 1px Neutral 200 border and 16px radius, headed by the
   two-digit number in Primary 500 followed by the uppercase letter-spaced section name.
3. Every swatch, spec list, and label text on the page must match the reference wording exactly,
   including the printed hex codes, px values, and shadow definitions.
4. Responsive down to 320px (AGENTS.md §3): multi-column section rows stack, swatch and icon rows
   wrap, the cards row becomes a single column, and the type-scale table scrolls horizontally inside
   its own container rather than making the page scroll sideways.
5. Desktop layout must stay pixel-faithful to the reference at ≥1024px.
6. Components take a `className` prop merged through `cn()` so pages can adapt them.
7. Buttons render `<button>` by default and support `disabled`; the hover and disabled treatments
   in the reference are real CSS states, and the design-system page shows the hover row using the
   same component with a forced-state class so it is not a separate hard-coded copy.
8. No `any`, no unused exports, no `eslint-disable`.

## Security considerations

- No secrets, tokens, env vars, network calls, or user input handling are introduced.
- No dataset, API route, or server action is touched, so the server/client and private-token
  boundaries in AGENTS.md §5 and §12 are unaffected.
- `clsx` and `tailwind-merge` are the only new dependencies: both are widely used, dependency-free,
  and build-time only.
- The design-system route renders static local content only — nothing user-supplied, no
  `dangerouslySetInnerHTML`.

## Acceptance criteria

- [ ] `/design-system` renders all 14 sections and visually matches `design/vertex-designsystem.png`
      at desktop width.
- [ ] All 13 palette hexes are exposed as Tailwind utilities (`bg-primary-500`, `text-neutral-700`, …)
      and the swatches on the page use those utilities, not inline hex.
- [ ] All 8 type styles are Tailwind text utilities (`text-display-1` … `text-small`) that carry the
      correct size **and** line height, and the type-scale table demonstrates each one.
- [ ] The 6 radius and 4 shadow tokens are Tailwind utilities and the page demos use them.
- [ ] Buttons: 4 variants × 3 states render correctly, 44px tall, 12px radius.
- [ ] Inputs: search and select are 44px tall, 12px radius, and show the orange focus border on focus.
- [ ] All four card shapes render with the exact reference copy.
- [ ] Badges, status indicators, progress bar, breadcrumbs, and pagination match the reference.
- [ ] The page is usable and unbroken at 320px with no horizontal page scroll.
- [ ] `npx tsc --noEmit` clean.
- [ ] `npm run lint` clean.
- [ ] `npm run build` succeeds.

## Checks to run

Run from the repo root (the single web workspace):

```
npx tsc --noEmit
npm run lint
npm run build
npm run dev     # then open /design-system
```

No Studio workspace exists yet, so the AGENTS.md §13 Studio checks do not apply to this task.

## Manual test steps

1. `npm run dev`, open `http://localhost:3000/design-system`.
2. Put the browser window beside `design/vertex-designsystem.png` at ≥1280px wide and compare
   section by section, 01 through 14: colors, both typeface specimens, the type-scale table, the
   spacing ramp, radius and shadow demos, both icon rows, the button matrix, the inputs, badges,
   status indicators, progress bar, all four cards, nav/breadcrumbs/pagination, and the principles.
3. Confirm every printed hex, px value, and shadow string on the page matches the image.
4. Hover the Primary, Secondary, Tertiary, and Text buttons in the "Default" row — each should
   change to the treatment shown in the reference's "Hover" row.
5. Click into the search input and the select — the border should turn `#FB923C`.
6. Tab through the page: every button, input, select, breadcrumb, and pagination control should take
   focus with a visible ring.
7. Resize to 375px and to 320px: sections stack, nothing overflows the viewport horizontally, and
   the type-scale table scrolls inside its own box.
8. Confirm the page background is the warm canvas and cards are white.

---

## Implementation notes (post-build)

Deviations and additions made while matching the reference:

1. **Page max width is 1440px, not 1200px.** The reference is a 1024px-wide export of a design
   authored wider. At 1200px the title wrapped, the spacing ramp and icon rows broke onto two lines,
   and the neutral swatch labels wrapped. 1440px reproduces the reference proportions.
2. **Row column ratios were measured off the reference card edges** rather than guessed:
   row 1 `1fr / 2.3fr`, row 2 `1fr / 1.4fr`, row 3 `1.1fr / 1fr`, row 4 `1.15fr / 2.05fr / 1fr`,
   row 5 `0.88fr / 1.25fr / 1.17fr`, nav `1fr / 1.2fr / 1.08fr`.
3. **Section panels carry `min-w-0`.** Grid children default to `min-width: auto`, so the type-scale
   and button tables inside `overflow-x-auto` were widening their tracks and pushing the page wide.
4. **`cn()` extends tailwind-merge** with the Vertex font-size class names. Left unregistered,
   tailwind-merge reads `text-body` as a text *color* and drops it when a color class follows.
5. **`agent/` and `.agents/` are excluded from `tsc` and `eslint`.** They hold vendored skill
   reference apps whose imports resolve through the `@/*` path mapping onto the real components, so
   they were failing the type check with errors unrelated to this repo's source.
6. **Button demos use `size="md"`**; at `lg` the four columns did not fit the reference's card width.
7. **Card meta rows are `text-small` with `size-3.5` icons**, matching the reference; at `text-body`
   the course card's three meta items wrapped.
8. Verified with CDP device emulation at 320 / 375 / 768 / 1024 / 1440: `scrollWidth <= clientWidth`
   at every width. The only elements extending past the viewport are the two wide tables, each
   inside its own `overflow-x-auto` box, which is the intended behaviour.
