# Link the logo to home, and add course bookmarks

## Goal

Two small, independent additions:

1. The site logo is inert. Make it a link to `/`, the way a site logo is
   expected to behave.
2. Lessons have a bookmark button; courses do not. Add the same affordance to
   the course detail page and to every course card.

## Skills / docs read

- `AGENTS.md` §3 (reuse existing components and Tailwind patterns before adding
  new ones), §7 (bookmarking is presentational only — a label, not access
  control; no backend), §5 (browser never writes).
- No Sanity/schema skill needed: neither change touches the content model.

## Code inspected

- `components/ui/logo.tsx` — `Logo` renders a `<span>`, no link. `LogoMark` is
  the bare glyph, used separately by the design system page.
- `components/site-header.tsx:23` — the only product call site of `<Logo />`.
- `app/design-system/_sections/navigation.tsx:48` — also renders `<Logo />`, as
  a *specimen* inside the design-system gallery.
- `components/lesson/lesson-bookmark-button.tsx` — the existing pattern:
  `"use client"`, fires PostHog, stores nothing.
- `lib/analytics/events.ts` — central `ANALYTICS_EVENTS` registry. Note the
  lesson bookmark button bypasses it with a raw `"lesson_bookmarked"` string.
- Course card call sites: `app/courses/page.tsx:91` (inline `Card`),
  `app/page.tsx:77` (inline `Card`, landing "popular" grid),
  `components/my-learning/enrolled-course-card.tsx:58`.
- `components/ui/card.tsx` — exports a generic `Card` plus a `CourseCard`
  preset. The three call sites above all build their own layout on `Card`;
  `CourseCard` is only used by the design-system gallery.

## Decisions and assumptions

1. **Logo linking.** Wrap the logo's contents in `next/link` to `/` *inside*
   `Logo`, so every call site benefits and the header does not grow a wrapper.

2. **The design-system specimen is the catch.** `navigation.tsx` renders
   `<Logo />` as a visual specimen; making `Logo` unconditionally a link puts a
   navigating anchor inside a gallery. Give `Logo` an optional `href` prop
   defaulting to `"/"`, and pass `href={null}` at the specimen call site to keep
   it a plain `<span>`. This avoids a nested-anchor or surprise-navigation bug.

3. **`aria-label="Vertex, home"`** on the link. The word "Vertex" is already in
   the visible text, so the label exists to name the *destination*, not to
   restate the brand.

4. **One shared bookmark component**, not two. Generalize the existing lesson
   button into `components/ui/bookmark-button.tsx` taking a `kind`
   (`"course" | "lesson"`), a `slug`, and an optional `className`. Re-point
   `LessonBookmarkButton` at it so behavior stays identical and there is one
   place bookmarking is defined. Do not duplicate the markup three times.

5. **Presentational, per the user's explicit choice and AGENTS.md §7.** The
   button fires analytics and holds pressed state in local React state only.
   It does NOT persist: no server route, no write token, no schema, no Clerk
   read. State resets on reload — this is intended, not an oversight.

6. **Because it does not persist, the control must not claim it did.** Use
   `aria-pressed` and a filled/outlined icon swap for immediate feedback, but
   do not add "Saved" copy or anything implying durable storage. Flag in the
   report that reload discards it, so the user can decide if that is shippable.

7. **Route the event through the registry.** Add
   `COURSE_BOOKMARKED: "course_bookmarked"` and
   `LESSON_BOOKMARKED: "lesson_bookmarked"` to `ANALYTICS_EVENTS`, and use them.
   This also fixes the existing raw-string call site. The name and payload for
   lessons stay byte-identical, so no PostHog funnel breaks.

8. **Card placement.** The three course-card call sites build bespoke layouts on
   `Card`, so add the button to each rather than to the `Card` primitive.
   Position it top-right of the card header row, opposite the cover image, which
   is where the lesson page already puts its bookmark relative to the title.

9. **Card cover image is decorative.** Where a card's cover `<Image>` sits
   beside a title that already links, keep it as-is; not in scope.

## Files expected to change

- `components/ui/logo.tsx`
- `app/design-system/_sections/navigation.tsx` (pass `href={null}`)
- `components/ui/bookmark-button.tsx` (new, generalized)
- `components/lesson/lesson-bookmark-button.tsx` (delegate to the shared one)
- `lib/analytics/events.ts` (two event names)
- `app/courses/[slug]/page.tsx` (detail hero)
- `app/courses/page.tsx` (catalog card)
- `app/page.tsx` (landing popular card)
- `components/my-learning/enrolled-course-card.tsx` (enrolled card)

## Requirements

1. `Logo` renders an `<a>` to `/` by default and a plain `<span>` when
   `href={null}`. It never nests inside another anchor.
2. The bookmark button is keyboard reachable, has a discernible name, and
   exposes `aria-pressed`.
3. Clicking a card's bookmark must NOT navigate to the course. The card title is
   a link and the button sits near it — call `preventDefault`/`stopPropagation`
   as needed, and verify a click does not trigger the title link.
4. Each card's button carries its own state; toggling one card must not toggle
   another. Key state per slug.
5. `EnrolledCourseCard` is a server component — the button is a client island
   imported into it, and the card itself must not gain `"use client"`.
6. No token, route, schema, or server/client boundary change.

## Security considerations

- No new data access, no write path, no token. Bookmarks are client-side state
  and an analytics event.
- The event payload carries only the course/lesson slug — authored catalog
  content, not user data — matching the registry's documented rule that the
  Clerk id travels as the distinct id and never as a property.

## Acceptance criteria

- Clicking the header logo on any page navigates to `/`.
- The design-system navigation specimen does not navigate.
- A bookmark button appears on the course detail hero and on catalog, landing,
  and My Learning course cards.
- Toggling a card's bookmark does not open the course and does not affect other
  cards.
- `grep -rn '"lesson_bookmarked"' components app` returns nothing (registry used).
- Type check, lint, and production build pass.

## Checks to run

```
npx tsc --noEmit
npm run lint
npm run build
npm run dev   # manual pass below
```

## Manual test steps

1. `npm run dev`. From `/courses`, click the header logo — lands on `/`.
2. Repeat from `/my-learning` and a lesson page.
3. Open `/design-system`, find the navigation specimen, click its logo —
   it must not navigate.
4. On `/courses`, click a card's bookmark: the icon fills, the page does not
   navigate, and neighboring cards stay unbookmarked.
5. Tab to a card bookmark and press Enter — same result.
6. Open a course detail page, bookmark from the hero.
7. In PostHog, confirm `course_bookmarked` fires with `course_slug`, and that a
   lesson bookmark still fires `lesson_bookmarked` unchanged.
8. Reload — bookmarks reset. Expected, per the presentational decision.
9. Check all four surfaces at 375px: the button must not overlap the title or
   push the meta row into overflow.
