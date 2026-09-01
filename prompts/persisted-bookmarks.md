# Persist bookmarks, and give them a place to be managed

## Goal

Bookmarks are currently a lie the UI tells: the button toggles, fires a PostHog
event, and forgets everything on reload. Make them real.

1. Bookmarking a course or a lesson persists per learner, keyed by Clerk user id.
2. The button reflects stored state on load, and un-bookmarking works.
3. A **Saved** page lists what the learner bookmarked, so there is somewhere to
   manage them.

This reverses the presentational-only decision for bookmarks in AGENTS.md §7 at
the user's explicit request. The other §7 presentational surfaces (notifications
bell, Notes tab, free-preview badge) stay exactly as they are.

## Skills / docs read

- `AGENTS.md` §5 (server/client boundary; browser never writes, all writes go
  through a server route with a write token), §7 (progress keys off the Clerk
  user id; enrollment is not entitlement), §8 (the data model; progress is app
  state kept apart from read-only content), §12 (write token is server-only),
  §13 (checks to run).
- `sanity-best-practices` — global rule against deterministic ids for ordinary
  documents; the existing `progress` doc follows it (Clerk id in a `userId`
  field, every lookup queries that field). Bookmarks inherit the same rule.
- `prompts/logo-home-link-and-course-bookmarks.md` — the prompt that created the
  current presentational button, decision 4 (one shared component) and 5
  (presentational). Decision 5 is what this prompt supersedes.
- `prompts/progress-backend-and-my-learning-actions.md` — the write-route
  pattern being extended here.
- No Next.js doc re-read needed: no new routing or data-fetching primitive: this
  adds one page and one action to an existing route handler.

## Code inspected

- `components/ui/bookmark-button.tsx` — `useState(false)`, PostHog on the
  bookmark-on edge only, no persistence. Takes `kind` + `slug` + `className`.
  Comment explicitly says the pressed state "is gone on reload" and that "Saved"
  copy is avoided on purpose.
- `components/lesson/lesson-bookmark-button.tsx` — thin alias over the above.
- `app/api/progress/route.ts` — the single write route. `ACTIONS` tuple at :47,
  `isDocumentId` validation, `withValue` / `withoutValues` helpers,
  `ProgressState` interface, `toState()` normalizer, and a read-modify-write
  loop with `ifRevisionId` + 409 retry (`MAX_ATTEMPTS = 3`). The header comment
  explains *why* it reads-computes-`set`s whole arrays instead of chaining
  `.append()`/`.unset()`: Sanity applies patch ops in a fixed order, not call
  order — verified against the live dataset.
- `lib/progress.ts` — `server-only`. `LearnerProgress` (sets + a map),
  `EMPTY`, `toSet()`, `getProgressForUser()` (fetch once per request),
  `courseProgress()`, `getCourseProgress()`. Doc comment warns against calling
  the fetch per course.
- `studio/schemaTypes/documents/progress.ts` — `readOnly: true`, one doc per
  learner enforced by a custom validation rule on `userId`; arrays of string ids
  with the rationale that slugs are editable content and must not be stored.
- `sanity/lib/queries.ts` — `PROGRESS_BY_USER_QUERY` (:234) projects the four
  progress fields explicitly; `courseCardProjection` (:3) already includes
  `_id`; `COURSE_BY_SLUG_QUERY` (:28) and `LESSON_BY_SLUG_QUERY` (:55) both
  project `_id`.
- `sanity/lib/data.ts:229` — `getProgressRecord`, `useCdn: false`,
  `perspective: 'published'`, `cache: 'no-store'`.
- `components/course/course-cta-buttons.tsx` — the fetch-with-rollback template
  (`busy` / `failed` state, `router.refresh()` on success). **Also contains a
  fifth, undocumented bookmark surface**: a raw inline `<button>` at :137 that
  is not `BookmarkButton` and fires a hardcoded `"course_bookmarked"` string
  rather than the `ANALYTICS_EVENTS` constant.
- Call sites: `app/page.tsx:103`, `app/courses/page.tsx:117`,
  `app/courses/[slug]/page.tsx:143`, `app/lessons/[slug]/page.tsx:166`,
  `components/my-learning/enrolled-course-card.tsx:84`. **Every one passes a
  slug, none passes an id** — but `_id` is in scope at all five.
- `app/my-learning/page.tsx` — `Shell` / `Heading` / `EmptyState` helpers,
  `?status=` parsing, `auth()` + signed-out `SignInButton` state.
- `components/my-learning/my-learning-filters.tsx` — server-side filtering via
  URL navigation, the pattern a Saved page's tabs should follow.
- `lib/analytics/events.ts:71-72` — `COURSE_BOOKMARKED` / `LESSON_BOOKMARKED`.

## Decisions and assumptions

1. **Store bookmarks on the existing `progress` document**, as two new string
   arrays `bookmarkedCourses` and `bookmarkedLessons` — not a new `bookmark`
   document type.

   The reason is the one already written into `progress.ts`: a page that renders
   many cards needs every learner-state value at once, and one document means
   one fetch instead of one query per card. A separate document would force a
   second round trip on every page that shows both progress and bookmarks
   (My Learning, the catalog, the course page).

   The cost, stated plainly: the document is named "progress" and a bookmark is
   not progress. I am accepting a slightly overloaded document to avoid a
   per-page extra fetch. If the user prefers conceptual cleanliness over that,
   this is the one decision to flip — the route and lib changes are shaped the
   same either way. **Flagged in "Needs your attention".**

2. **Store ids, never slugs.** Same rationale as the existing arrays: a slug is
   editable content, and an author renaming one must not silently drop a
   learner's bookmark.

3. **This forces a call-site change.** All five call sites currently pass only a
   slug. `BookmarkButton` gains a required `id` prop (the Sanity `_id`) and
   keeps `slug` for analytics. `_id` is already in scope everywhere — verified
   at all five sites — so no query changes.

4. **One toggle action, not two.** Add a single `toggle-bookmark` action taking
   `kind: "course" | "lesson"` plus the id, rather than four
   add/remove actions. The route computes the next array with the existing
   `withValue` / `withoutValues` helpers and returns the resulting boolean so
   the client can settle its optimistic state without a refetch.

5. **`courseId` is currently required for every action.** The route validates
   `isDocumentId(courseId)` unconditionally at :137. A lesson bookmark has no
   course. Relax that check to apply to the actions that actually need it rather
   than adding a fake courseId — and keep it strictly required for all five
   existing actions so their guarantees do not weaken.

6. **Optimistic toggle with rollback.** The button flips immediately, POSTs, and
   reverts on failure. Bookmarking is high-frequency and low-stakes; a spinner
   on every click would feel broken. Failure reverts silently with an
   `aria-live` announcement rather than the CTA's visible error text, because
   the button often sits inside a card where there is no room for a message.

7. **Signed-out visitors get a sign-in prompt, not a 401.** Catalog and course
   pages are public (§7), so the button stays visible; clicking it opens Clerk's
   modal, matching `CourseCTAButtons`. `BookmarkButton` takes `isSignedIn`.

8. **Analytics: keep the existing two events, add the un-bookmark edge.** The
   current button deliberately does not fire on un-bookmark, calling it "noise."
   With persistence, removal is now a real, meaningful action, so add
   `COURSE_UNBOOKMARKED` / `LESSON_UNBOOKMARKED` to the registry. Fire only
   after the write succeeds, so events do not count writes that failed.

9. **Fix the rogue CTA button (decision 5's leftover).** Replace the inline
   `<button>` in `course-cta-buttons.tsx` with the shared `BookmarkButton` so
   there is one definition of bookmarking, and the hardcoded
   `"course_bookmarked"` string stops bypassing `ANALYTICS_EVENTS`. Without
   this, the course page would show a persisted bookmark and a fake one side by
   side.

10. **The Saved page is `/saved`, not a My Learning tab.** My Learning is scoped
    to *started* courses and filters by completion status; a bookmarked course
    that was never opened does not belong to any of those states. A sibling page
    reusing My Learning's `Shell`/`EmptyState` shape keeps both pages honest.
    It lists bookmarked courses and bookmarked lessons in two sections, each
    item removable in place.

11. **`/saved` prompts in-page rather than being gated in middleware.**

    *Revised during implementation.* There is no `middleware.ts`: this project
    uses `proxy.ts`, which is a bare `clerkMiddleware()` that deliberately gates
    nothing, and `app/my-learning/page.tsx` carries a comment stating the
    convention — browsing stays public (§7) and signed-out learners get an
    in-page prompt, not a redirect. `/saved` follows that existing pattern
    instead of introducing route protection. The header's Saved link is wrapped
    in Clerk's `<Show when="signed-in">` so it is only offered once there is an
    account for it to belong to.

12. **Copy can now say "Saved."** The `LABELS` comment forbidding it existed
    only because nothing was stored. That constraint is gone.

## Files expected to change

**Studio**
- `studio/schemaTypes/documents/progress.ts` — add `bookmarkedCourses`,
  `bookmarkedLessons`; update the doc comment to say the document holds learner
  state, not progress alone.

**Data**
- `sanity/lib/queries.ts` — project the two new fields in
  `PROGRESS_BY_USER_QUERY`; add a query resolving bookmarked ids to course and
  lesson cards for `/saved`.
- `sanity/lib/data.ts` — a fetch helper for that new query.
- `sanity/types.ts` (or wherever TypeGen output lives) — regenerate.

**Server**
- `app/api/progress/route.ts` — `toggle-bookmark` in `ACTIONS`, a `kind`
  validator, the relaxed `courseId` rule (decision 5), the new branch, and the
  two new fields in `ProgressState` / `toState`.

**Read path**
- `lib/progress.ts` — `bookmarkedCourses` / `bookmarkedLessons` on
  `LearnerProgress`, in `EMPTY`, and in `getProgressForUser`.

**UI**
- `components/ui/bookmark-button.tsx` — `id`, `initialBookmarked`, `isSignedIn`;
  optimistic POST with rollback.
- `components/lesson/lesson-bookmark-button.tsx` — forward the new props.
- `components/course/course-cta-buttons.tsx` — swap the inline button.
- `app/page.tsx`, `app/courses/page.tsx`, `app/courses/[slug]/page.tsx`,
  `app/lessons/[slug]/page.tsx`,
  `components/my-learning/enrolled-course-card.tsx` — pass `id`,
  `initialBookmarked`, `isSignedIn`.
- `app/saved/page.tsx` — new.
- `components/saved/*` — the card/rows for saved items.
- `lib/analytics/events.ts` — two new events.
- `middleware.ts` — protect `/saved`.
- Possibly `components/site-header.tsx` — a link to `/saved`.

## Requirements

- The browser never writes Sanity directly. Every mutation goes through
  `/api/progress` with the server-side write token.
- The learner id comes from `auth()` on the server. A body-supplied user id is
  ignored, exactly as the route does today.
- Ids are validated with `isDocumentId` before they reach an array.
- The read-modify-write + `ifRevisionId` + 409-retry pattern is preserved. Do
  **not** "simplify" it into chained `.append()`/`.unset()` — the route's header
  comment documents why that silently corrupts data.
- No existing action's behavior changes. Enrollment, completion, position,
  removal, and reset must work exactly as before.
- Bookmarking remains orthogonal to enrollment and to entitlement. Bookmarking a
  course must not enroll the learner, must not appear on My Learning, and must
  not grant access to anything.
- Progress stays excluded from the search agent's content scope, so learner
  bookmarks never reach the LLM.
- The five existing call sites keep their current visual appearance; only the
  props change.

## Security considerations

- Write token stays server-only, used only inside the route handler (§12).
- The `kind` parameter is validated against a literal union before selecting
  which array to write — it must never be used to index into the document
  dynamically, or a caller could write arbitrary fields.
- Ids are validated, and no id is interpolated into a GROQ filter path — the
  route's existing property (it reads whole arrays and writes computed ones), so
  there is no query-injection surface. Preserve it.
- `/saved` renders only the signed-in learner's own state; the query is
  parameterized by the `auth()` user id, never by anything from the request.
- Toggle is idempotent per state, so a replayed request cannot corrupt the array.

## Acceptance criteria

1. Bookmarking a course, reloading, and returning shows it still bookmarked.
2. Un-bookmarking persists too, and the button returns to its unset state.
3. Same for lessons.
4. `/saved` lists exactly the learner's bookmarked courses and lessons, and
   removing one there removes it everywhere.
5. Two learners' bookmarks are independent.
6. Signed out: the button shows unset and opens the sign-in modal; `/saved`
   redirects or prompts rather than erroring.
7. A failed write reverts the button rather than leaving a false "Saved".
8. Enrolling, completing a lesson, saving a position, removing and resetting a
   course all still behave exactly as before.
9. Bookmarking a course does not add it to My Learning.
10. Only one bookmark control renders on the course page.
11. Type check, lint, and build all pass.

## Checks to run

From `web`:
- `npm run typecheck`
- `npm run lint`
- `npm run build` — required, since a route, middleware, and server modules change.
- `npm run dev` for the manual pass.

From `studio`:
- TypeGen after the schema change (extract + generate) so `sanity/types.ts` is current.
- `npx sanity schema deploy` — the schema changed.
- Studio app redeploy is **not** needed: no Context/MCP change, and §12's
  deployed-app requirement is already satisfied.

## Implementation notes (written after the fact)

Two things worth recording, because neither was visible when the prompt was
written:

- **`...state` spread in `complete-lesson` and `reset-course`.** Both branches
  previously listed every `ProgressState` field explicitly. Because the route
  writes whole objects with `.set()`, leaving them explicit would have silently
  wiped a learner's bookmarks every time they completed a lesson or reset a
  course. Both now spread `state` first. This is the subtlest bug in the change.

- **`BookmarkButton` resets state during render, not in an effect.**
  `react-hooks/set-state-in-effect` correctly rejected the obvious
  `useEffect(() => setBookmarked(initial), [initial])`. It now compares the
  previous server value during render and drops the optimistic guess when the
  server sends a new one — React's documented pattern for resetting state on a
  prop change, and one fewer render.

## Manual test steps

1. `npm run dev`, sign in.
2. Catalog: bookmark a course. Hard-reload. It is still bookmarked.
3. Open that course's page. The bookmark shows set, and there is exactly **one**
   bookmark control (verifies the rogue CTA button is gone).
4. Un-bookmark there. Reload. It is unset, on both the course page and catalog.
5. Open a lesson, bookmark it, reload, confirm it persists.
6. Visit `/saved`. Both the course and the lesson appear.
7. Remove the course from `/saved`. It disappears; the catalog agrees.
8. Sign out. Visit the catalog: buttons render unset, clicking opens sign-in.
   Visit `/saved`: sign-in prompt, no error.
9. Sign in as a second user. `/saved` is empty — no leakage from user one.
10. Regression: enroll in a course, complete a lesson, check My Learning shows
    the right percentage, then reset it and confirm it returns to 0% and stays
    listed.
11. Bookmark a course you are *not* enrolled in; confirm My Learning does not
    list it.
12. DevTools → Network: confirm every toggle is a POST to `/api/progress` and
    that no Sanity token appears in any client payload.
