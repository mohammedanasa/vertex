# Implementation Prompt — Progress Backend, plus Remove and Reset on My Learning

## Goal

Give learners a way to **remove a course from My Learning** and **reset its progress**, and build the
real progress backend those actions need.

The request is the two card actions. The backend comes with it because the actions are meaningless
without it: progress today is derived in `lib/progress.ts` from a hash of the Clerk user id and the
course id, so a "removed" or "reset" course reappears at exactly the same percentage on the next
load. The user chose to build the real backend rather than fake the actions.

This retires every progress placeholder in the codebase in one pass, which is what
`lib/progress.ts` was written to enable.

Scope confirmed with the user:
- **Build the real progress backend** — Sanity document keyed by the Clerk user id, plus a server
  write route.
- **Overflow menu** on each My Learning card holding both actions.
- **Confirm both actions** before they take effect.

## Skills / docs read

- `AGENTS.md` — §5 (server/client boundaries: any write goes through a server route with a write
  token; the browser never writes; app state kept apart from read-only content), §7 (progress is
  per learner, keyed by the Clerk user id, surfaced as completion marks and a resume affordance),
  §8 (the progress record's shape), §12 (write token is server-only; private dataset), §13 (checks).
- `sanity-best-practices` (`~/.claude/skills/sanity-best-practices/SKILL.md`) plus
  `references/schema.md` — read before writing the schema and the mutations. This is the first
  document this project writes at runtime, so follow the skill rather than the read-only patterns
  already in `sanity/lib/`.
  - **Key constraint it imposes** (Global Rules, and `references/schema.md:238-241`): let Sanity
    generate `_id`; do not build deterministic ids; store external identity (here, the Clerk user
    id) in a field and query by it. This overrode the id scheme in an earlier draft of decision 1.
- `node_modules/next/dist/docs/` — Route Handlers, `revalidatePath`, and the current `PageProps`
  typing. AGENTS.md warns this Next.js version differs from training data; confirm before writing.

## Code inspected

**The placeholders this replaces:**
- `lib/progress.ts:63` — `getCourseProgress(userId, courseId, totalLessons)`, an FNV-1a hash of
  `userId:courseId`. Its own doc comment names itself a placeholder and names this task as its
  replacement. Only consumer today is `app/my-learning/page.tsx:135`.
- `components/course/course-progress-bar.tsx:6` — `const PLACEHOLDER_PROGRESS = 35`.
- `components/lesson/lesson-sidebar.tsx:46` — a second `const PLACEHOLDER_PROGRESS = 35`, used at
  lines 89 and 94.

**Completion is already detected, just not stored:**
- `components/lesson/lesson-video.tsx:166-177` — when watch depth crosses `COMPLETION_MILESTONE`
  (90, from `lib/analytics/events.ts:91`) and `watchedEnough`, it fires `LESSON_COMPLETED` to
  PostHog behind a `firedCompletion` ref. This is the natural place to also persist completion.

**Write patterns that exist:**
- `scripts/ingest-videos.mjs:396-400` — `createClient` with `token: writeToken || readToken`, then
  `client.createOrReplace(doc)` at line 444. Offline only; AGENTS.md §12 says the write token is
  used *only* by this script today, so a runtime write client is new and must be its own module.
- `app/api/search/route.ts` — the one existing route handler. Sets `runtime = "nodejs"` and
  `dynamic = "force-dynamic"`, validates the body shape before use, and returns a distinct status
  for upstream failure vs empty result. Follow its validation posture.
- `sanity/lib/client.ts` — read client, `useCdn: true`, no token. `sanity/lib/live.ts` — `defineLive`
  with `serverToken: token, browserToken: false`. `sanity/lib/env.ts` asserts
  `SANITY_API_READ_TOKEN` at module load; note it does **not** currently assert the write token.

**The presentational-control precedent:**
- `components/ui/bookmark-button.tsx` — the established pattern for a control with no backend:
  local state, no "Saved" copy, and a doc comment stating it "must not imply storage it does not
  have." It also calls `event.preventDefault(); event.stopPropagation()` because it sits inside a
  card whose title is a link — the overflow menu has the same problem and needs the same guard.
  Once this task lands, remove/reset are genuinely persistent and do **not** follow that pattern;
  bookmarking stays presentational and is out of scope.

**My Learning as it stands:**
- `app/my-learning/page.tsx` — server component. `parseStatus` validates `?status=` against a closed
  list. `started` is built by `flatMap` over `getCourses()`, dropping anything with
  `!progress.hasStarted`. Cards get `progress` and `resumeSlug` as props.
- `components/my-learning/enrolled-course-card.tsx` — server component; only `CourseResumeLink` is
  client-side.
- `sanity/lib/queries.ts` — `courseCardProjection` already yields `lessonCount` and `lessonSlugs`.
- `components/ui/container.tsx` — the single page width (`max-w-7xl`). New surfaces use it.

## Decisions and assumptions

1. **One `progress` document per learner, not per learner-course.** Fields: `userId` (string, the
   Clerk id), `completedLessons` (array of lesson ids), `lastPosition` (array of
   `{ lessonId, seconds }`), `startedCourses` (array of course ids), and `removedCourses`
   (array of course ids).
   - **Sanity generates the `_id`; the Clerk id lives in the `userId` field.** The
     `sanity-best-practices` skill is explicit here (`references/schema.md:238-241`): let Sanity
     assign ids, keep explicit ids to Studio-managed singletons, and store external identity as a
     field you query by. An earlier draft of this prompt specified a deterministic
     `progress.${userId}` id — that is corrected. `userId` gets a unique index-style validation and
     every lookup goes through `*[_type == "progress" && userId == $userId][0]`.
   - **Upsert without a deterministic id:** the write route fetches the learner's document id once,
     then patches it; if none exists it creates one. Wrap the create in a transaction guarded by the
     lookup so two concurrent first-writes cannot both create a document. If a duplicate ever does
     appear, the query's `[0]` with a stable `order(_createdAt asc)` keeps reads deterministic.
   - **Rationale for one document over per-course:** a learner's whole progress loads in a single
     fetch for My Learning, which otherwise needs one query per course. It also means one document
     to look up per write, which keeps the upsert above simple.
   - **Store lesson ids, not slugs.** Slugs are editable content; an author renaming a slug must not
     silently un-complete a learner's lesson.
2. **`removedCourses` is what "remove from My Learning" writes.** Removal hides the course from the
   page; it does **not** delete completion data. A learner who reopens the course and starts a
   lesson gets their history back. State this in the confirmation copy so "Remove" is not mistaken
   for "erase everything".
3. **Reset clears that course's completions and positions, and un-removes it.** Reset is the
   destructive one. It deletes the learner's `completedLessons` and `lastPosition` entries for
   lessons belonging to that course, leaving other courses untouched.
   - Reset needs to know which lessons belong to the course. Resolve that server-side from the
     course's `lessonSlugs`/lesson ids — never trust a client-supplied lesson list.
4. **`lib/progress.ts` keeps its exported shape.** `CourseProgress` stays as-is
   (`completedLessons`, `totalLessons`, `percentComplete`, `isComplete`, `hasStarted`) so
   `EnrolledCourseCard` needs no prop changes. `getCourseProgress` becomes async and reads the
   fetched progress document instead of hashing. The hash function and its comment go.
   - Add a `getProgressForUser(userId)` that fetches the document **once**, and have the page derive
     each course's `CourseProgress` from it. Do not fetch per course.
   - **4a.** `hasStarted` means "the learner has touched this course and has not removed it" —
     specifically: it has a completed lesson, a stored position, **or** an explicit `startedCourses`
     entry, and it is not in `removedCourses`. The `startedCourses` array is what keeps a freshly
     reset course on the page at 0%; without it, reset would clear the only evidence the learner
     ever opened the course and the card would disappear. Reset therefore clears completions and
     positions but leaves the `startedCourses` entry intact.
5. **One write route, `app/api/progress/route.ts`**, handling `POST` with a discriminated action:
   `complete-lesson`, `remove-course`, `reset-course`. One route rather than three keeps the auth
   check, the write-client construction, and the validation in one place.
   - `runtime = "nodejs"`, `dynamic = "force-dynamic"`, matching the search route.
   - **The route derives `userId` from `auth()` server-side and ignores any client-supplied user
     id.** This is the security crux: accepting a user id from the body would let any caller rewrite
     another learner's progress.
   - Returns 401 when unauthenticated, 400 on a malformed body, 200 on success.
6. **A new server-only write client**, `sanity/lib/write-client.ts`, with `useCdn: false` and the
   write token. Kept separate from `sanity/lib/client.ts` so the read path cannot accidentally gain
   write capability. Assert `SANITY_API_WRITE_TOKEN` **inside the module**, not in `sanity/lib/env.ts`
   — adding it to `env.ts` would make every page that reads content fail at import time when the
   write token is absent.
7. **Progress documents are excluded from the search agent's content scope.** They are learner state,
   not catalog content. Check `sanity/context/vertex-search.json`'s content filter and add an
   exclusion if the filter is allow-list-by-omission rather than explicit. AGENTS.md §10 says the
   scope limits visible types to the content ones; a learner's progress must never reach the LLM.
8. **Overflow menu is a client component** using a native `<details>`/`<summary>` or a small
   `useState` popover — no new dependency. It must:
   - `preventDefault`/`stopPropagation` like `BookmarkButton`, since it sits on a card with a linked
     title.
   - Close on outside click and on `Escape`, and be keyboard reachable.
   - Show an inline confirmation step in place of the menu items, not a `window.confirm`.
9. **The page revalidates after a write.** The action component calls the route, then
   `router.refresh()`, so the server component re-reads progress. Do not mirror progress into client
   state — that reintroduces the drift this task removes.
10. **Two new analytics events**, `COURSE_REMOVED_FROM_LEARNING` and `COURSE_PROGRESS_RESET`, in
    `lib/analytics/events.ts`. Capture from the client on success, keeping the Clerk id out of the
    payload — PostHog carries it as the distinct id, per that file's header comment.
11. **Lesson completion now persists.** `lesson-video.tsx` additionally POSTs `complete-lesson` at
    the same milestone, behind the existing `firedCompletion` ref so it fires once. Failure is
    swallowed — a dropped progress write must never break playback.

## Files expected to touch

**New**
- `studio/schemaTypes/documents/progress.ts` — the progress document.
- `sanity/lib/write-client.ts` — server-only write client.
- `app/api/progress/route.ts` — the write route.
- `components/my-learning/course-actions-menu.tsx` — client; overflow menu, confirmation, POST.

**Modified**
- `studio/schemaTypes/index.ts` — register `progress`.
- `lib/progress.ts` — real reads; `getProgressForUser` added; hash removed.
- `sanity/lib/queries.ts` — a progress-by-user query.
- `app/my-learning/page.tsx` — fetch progress once; honor `removedCourses`; pass the menu.
- `components/my-learning/enrolled-course-card.tsx` — render the menu.
- `components/course/course-progress-bar.tsx` — real progress, placeholder deleted.
- `components/lesson/lesson-sidebar.tsx` — real progress, placeholder deleted; completion marks.
- `components/lesson/lesson-video.tsx` — persist completion alongside the PostHog event.
- `lib/analytics/events.ts` — two new events.
- `.env.example` — document that `SANITY_API_WRITE_TOKEN` is now used by the app at runtime, not
  only by the ingestion script. **Its existing comment says the opposite and must be corrected.**

**Explicitly not touched**
- `components/ui/bookmark-button.tsx` — bookmarking stays presentational; not this task.
- The search pipeline, beyond the context-scope exclusion in decision 7.

## Requirements

- Both actions confirm inline before taking effect, and either can be cancelled.
- Remove hides the course from My Learning and persists across reload, navigation, and a new session.
- Reset returns the course to 0% and **keeps it on My Learning** (user decision): a learner who just
  reset almost certainly means to redo the course, so it must not vanish. This means `hasStarted`
  cannot be "has any completion" alone — see decision 4a.
- Confirmation copy states plainly what each action does, including that Remove keeps completion data.
- Course and lesson pages show real progress; both `PLACEHOLDER_PROGRESS` constants are gone.
- Completing a lesson persists and is visible on My Learning without a manual refresh.
- A signed-out visitor sees the existing sign-in prompt; no action is reachable.
- Reuse existing primitives (`Card`, `ProgressBar`, `StatusIndicator`, `Button`, `Container`). No new
  colors, radii, or dependencies.
- Keyboard accessible: menu opens, moves, confirms, and dismisses with `Escape`.

## Security considerations

- **`userId` comes from `auth()` inside the route, never from the request body.** A body-supplied id
  would let a caller mutate another learner's progress. This is the single most important line in
  this task.
- `SANITY_API_WRITE_TOKEN` stays server-only, read only inside `sanity/lib/write-client.ts`, which is
  `server-only`. It must never be imported by a client component, and never prefixed `NEXT_PUBLIC_`.
- The route validates `action` against a closed set and validates `courseId` shape before use. Ids go
  into GROQ as **parameters**, never interpolated — matching `getLessonsForSearch`'s existing note.
- Reset resolves the course's lessons server-side; a client-supplied lesson list is not trusted.
- Progress is app state kept apart from read-only content (§5), and excluded from the search agent's
  content scope (decision 7) so learner data never reaches the LLM.
- No Clerk user id in analytics payloads.
- Rate limiting is **not** in scope; note it as follow-up if the route is ever exposed beyond the app.

## Acceptance criteria

1. Removing a course hides it from My Learning, and it is still hidden after a hard reload and in a
   fresh browser session.
2. Resetting returns the course to 0%, the card **stays on the page**, and other courses are
   unaffected.
3. Both actions are cancellable, and cancelling changes nothing.
4. Completing a lesson raises the percentage on My Learning and the course page.
5. Neither `PLACEHOLDER_PROGRESS` constant remains; `grep -rn "PLACEHOLDER_PROGRESS"` is empty.
6. `lib/progress.ts` contains no hash function and no derived state.
7. A POST carrying a different user's id in the body does not modify that user's document.
8. Unauthenticated POST returns 401.
9. No Sanity token appears in any client bundle or page payload.
10. Type check, lint, and production build all pass; the Studio schema deploys.

## Checks to run

Web (repo root):
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` — required: new route, schema-backed reads, server modules.
- `npm run typegen` — required: new query and document type.
- `npm run dev` for the manual pass.

Studio (`studio/`):
- `npx sanity schema deploy` — required; the new document type must reach the dataset.
- Confirm the Context MCP still serves the dataset after the schema change (AGENTS.md §12: the MCP
  needs a deployed Studio application).

## Manual test steps

1. `npm run dev`, sign in, open `/my-learning`.
2. Note a course's percentage. Open its overflow menu → **Reset progress** → cancel → percentage
   unchanged.
3. Reset again → confirm → the course reads 0% and the card is still on the page.
4. Hard reload → still 0%. Progress is genuinely stored, not client state.
5. Open the overflow menu → **Remove from My Learning** → confirm → the card disappears.
6. Reload, then open the page in a private window and sign in as the same learner → still removed.
7. Open a lesson in a removed course and watch past 90% → the course returns to My Learning with
   that lesson counted, confirming Remove hid rather than erased.
8. Open a lesson in another course, watch past 90% → `/my-learning` and the course page both show a
   higher percentage without a manual refresh.
9. Check the course page and the lesson sidebar → real percentages, not 35%.
10. Sign out → `/my-learning` shows the sign-in prompt and no actions.
11. `curl -X POST localhost:3000/api/progress -d '{"action":"remove-course","courseId":"x"}'` with no
    session → 401.
12. While signed in as learner A, POST with learner B's id in the body → B's document is unchanged.
13. Devtools → confirm no `SANITY_API_*` value in any client payload.
14. Resize to 1440 / 768 / 375 → the menu stays on screen and does not clip at the card edge.

---

## Implementation notes (added during the build)

**A bug the live-dataset check caught, worth remembering.** The first version of the route chained
`.append()` and `.unset()` in one patch — append the value, then unset any duplicate. It typechecked,
linted, built, and was wrong. Sanity applies patch operations in a **fixed order (unset before
insert), not in call order**, so the dedupe `unset` evaluated against the pre-append array. Symptoms:
completing a lesson twice duplicated it, and the reset patch's unsets wiped entries its own appends
had just added. Three of twelve assertions failed against the real dataset.

The route now reads the current arrays, computes the next state in plain JS, and `set`s them whole.
Deterministic, and it removes the GROQ-interpolation surface entirely — no id is ever spliced into a
filter path, so the earlier "validator is load-bearing for query safety" concern is moot.

The tradeoff is a read-modify-write race across two tabs. `ifRevisionId` turns that into a 409 the
route retries (up to 3 times) rather than a silent clobber; verified by committing from a
deliberately stale revision and asserting the rejection.

**Environment gap:** `SANITY_API_WRITE_TOKEN` was not set in `.env.local` at build time. The write
path is therefore verified against the dataset using the read token's credentials, and the app's own
write route will throw its "Missing environment variable" error until the token is added.

**Prerender change:** `/courses/[slug]` was SSG (`generateStaticParams`) and is now server-rendered
on demand, because it reads per-learner progress. Unavoidable for a personalized page; worth knowing
if course pages were relied on being static.
