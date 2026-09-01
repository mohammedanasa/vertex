# Implementation Prompt — Course Enrollment

## Goal

Make enrolling in a course a real thing a learner can do, so a course reaches My Learning without
having to watch a lesson to 90% first.

## The bug this fixes

Reported by the user: "I click on continue learning but it doesn't show up in my learning."

Confirmed by tracing the code. `startedCourses` — the field that decides whether a course appears on
My Learning — is written in exactly two places, both in `app/api/progress/route.ts`:
- line 159, the `complete-lesson` branch
- line 184, the `reset-course` branch, which only preserves an entry that already exists

Nothing else writes it. Both "Continue Learning" controls are plain links that fire a PostHog event
and navigate:
- `components/course/course-cta-buttons.tsx:53` — the hero CTA
- `components/course/course-progress-bar.tsx:34` — the sticky bar, via `CourseResumeLink`

So the only route into My Learning is **completing a lesson** (watch past `COMPLETION_MILESTONE`,
90%, in `components/lesson/lesson-video.tsx:167`). A learner who clicks Continue Learning, opens a
lesson, and watches half of it is still absent from My Learning. There is no way to say "I am taking
this course" short of finishing part of it.

Scope confirmed with the user:
- **An explicit Enroll button, plus auto-enroll when a lesson is opened**, so clicking through never
  strands a learner outside My Learning.
- **Rename `startedCourses` → `enrolledCourses`** rather than adding a parallel field.
- **The course page's primary button reflects state**: `Enroll` → `Continue Learning` → `Review Course`.

## Skills / docs read

- `AGENTS.md` — §5 (writes go through a server route with the write token; the browser never
  writes), §7 (progress is per learner, keyed by the Clerk user id), §8 (the progress record), §12
  (write token server-only), §13 (checks).
- `sanity-best-practices` + `references/schema.md` — reread for the field rename. Note
  `references/schema.md` also covers **deprecation patterns**; consult before choosing between a
  hard rename and a deprecated-field migration (see decision 2).
- `node_modules/next/dist/docs/` — Route Handlers and `router.refresh()`; confirm current APIs
  rather than assuming, per the AGENTS.md warning about this Next.js version.

## Code inspected

**The write path:**
- `app/api/progress/route.ts` — actions are `complete-lesson`, `remove-course`, `reset-course`
  (line 40). Reads current arrays, computes next state in JS, `set`s them whole under
  `ifRevisionId` with a 3-attempt retry. `userId` comes from `auth()` and the body's is ignored.
  A new action slots into the same `if/else` chain and inherits all of that.
- `sanity/lib/write-client.ts` — server-only; imported by the route alone (verified by grep).

**The read path:**
- `lib/progress.ts` — `getProgressForUser` normalizes the record into sets;
  `courseProgress(progress, courseId, lessonIds)` derives `hasStarted` as
  `(startedCourses.has(courseId) || completedLessons > 0 || any lastPosition) && !removed`.
- `studio/schemaTypes/documents/progress.ts` — `startedCourses` is a `string[]` whose description
  already explains it keeps a reset course visible at 0%.
- `sanity/lib/queries.ts` — `PROGRESS_BY_USER_QUERY` projects `startedCourses`.

**The UI:**
- `components/course/course-cta-buttons.tsx` — client component, hero CTA. Already captures
  `course_continue_learning_clicked` and `RESUME_USED`. Takes `continueHref`, `courseSlug`,
  `courseTitle`, `continueLessonSlug`.
- `components/course/course-progress-bar.tsx` — sticky bar; already takes `percentComplete` and
  `isComplete` and swaps its label to "Review Course" when complete. **The precedent for a
  state-reflecting button already exists here.**
- `components/course/course-resume-link.tsx` — its doc comment still says "there is no progress
  backend yet (AGENTS.md §7)". **Stale — the backend landed. Fix it.**
- `components/lesson/lesson-view-tracker.tsx` — client, fires `lesson_viewed` once on mount keyed on
  `lessonSlug`. The natural place to hang auto-enroll: same lifecycle, same once-per-lesson guard.
- `app/courses/[slug]/page.tsx` — already resolves `userId` via `auth()`, `progress`, and
  `resumeSlug`; passing an `isEnrolled` flag down costs nothing new.

**Existing patterns to follow:** `components/my-learning/course-actions-menu.tsx` is the reference
for a client control that POSTs to `/api/progress` then calls `router.refresh()`.

## Decisions and assumptions

1. **A new `enroll-course` action** on the existing route, rather than a new route. It joins the same
   auth check, validation, revision-guarded retry, and error handling. It is idempotent: enrolling
   twice is one entry, via the existing `withValue` helper.
   - Enrolling **also clears the course from `removedCourses`**. A learner who removed a course and
     then deliberately enrolls again plainly means to see it; leaving it hidden would look broken.
2. **Rename `startedCourses` → `enrolledCourses` everywhere** — schema, query, route, `lib/progress.ts`.
   - **Rationale:** "started" and "enrolled" would mean the same thing in practice, and two
     near-identical arrays invite drift where one read checks the wrong one.
   - **Migration:** the schema was deployed today and the dataset holds no real learner records (the
     only progress documents created so far were test fixtures, all deleted). **Verify that claim
     before renaming** — query `count(*[_type == "progress"])` against the dataset. If it returns 0,
     do a clean rename. If it returns anything above 0, stop and ask; do not silently orphan data.
   - Read `references/schema.md`'s deprecation guidance first and follow it if any record exists.
3. **Auto-enroll on lesson open, server-side.** The lesson page already knows `userId` and the
   course id. Rather than a client POST, enroll during the page's own render path.
   - **Caveat to resolve during implementation:** a Server Component must not perform a side-effecting
     write during render — it breaks on retry/prefetch and is not what render is for. So do this
     either through a Server Action invoked from a tiny client effect, or by having
     `LessonViewTracker` POST `enroll-course` the way `lesson-video.tsx` already POSTs
     `complete-lesson`. **Prefer extending the existing client tracker**: it matches the established
     pattern, keeps the write in the one route, and avoids a write in render. Confirm against
     `node_modules/next/dist/docs/` before choosing.
   - Fire-and-forget, guarded once per lesson mount. A failed enroll must never break the page.
   - Only when signed in. Pass `courseId`/`lessonId` as `null` when signed out, exactly as
     `lesson-video.tsx` already does, so the client cannot attempt an unauthorized write.
4. **The course page's primary button reflects enrollment state**, with the sticky bar already
   modelling this:
   - not enrolled → `Enroll` (writes, then `router.refresh()`)
   - enrolled, incomplete → `Continue Learning` (navigates, as today)
   - complete → `Review Course`
   - Signed out → `Enroll` that routes into Clerk's sign-in rather than POSTing. Course pages stay
     public (§7), so the button must not 401 in the learner's face.
5. **`hasStarted` keeps its meaning but loses its ambiguity.** After the rename it reads
   `(enrolledCourses.has(courseId) || completedLessons > 0 || any lastPosition) && !removed`. The
   completion/position fallbacks stay so a learner who completed lessons before enrollment existed
   is not dropped from My Learning.
   - Consider renaming the `CourseProgress.hasStarted` field to `isEnrolled` for the same
     clarity reason. If the rename widens the diff much, leave it and note it — the field is internal
     to `lib/progress.ts` and its two consumers.
6. **One new analytics event, `COURSE_ENROLLED`,** in `lib/analytics/events.ts`, with a property
   distinguishing an explicit click from an auto-enroll — otherwise the two are indistinguishable in
   funnels and the button's real conversion is unmeasurable. No Clerk id in the payload.
7. **Fix the stale comment** in `course-resume-link.tsx`. It tells the next reader something false.

## Files expected to touch

**Modified**
- `studio/schemaTypes/documents/progress.ts` — rename the field; update its description.
- `sanity/lib/queries.ts` — rename in `PROGRESS_BY_USER_QUERY`.
- `app/api/progress/route.ts` — add `enroll-course`; rename throughout.
- `lib/progress.ts` — rename; adjust `hasStarted`.
- `components/course/course-cta-buttons.tsx` — state-reflecting primary button; enroll on click.
- `components/lesson/lesson-view-tracker.tsx` — auto-enroll (per decision 3).
- `app/courses/[slug]/page.tsx` — pass enrollment state to the CTA.
- `app/lessons/[slug]/page.tsx` — pass `courseId`/`lessonId` to the tracker.
- `components/course/course-resume-link.tsx` — correct the stale doc comment.
- `lib/analytics/events.ts` — add `COURSE_ENROLLED`.

**Explicitly not touched**
- `components/ui/bookmark-button.tsx` — still presentational; separate concern.
- The remove/reset menu — unchanged, though enrolling now un-removes.

## Requirements

- A signed-in learner on a course page they have not enrolled in sees **Enroll**; clicking it makes
  the course appear on My Learning without watching anything.
- Opening any lesson of a course enrolls the learner in that course.
- Enrolling twice, or enrolling then opening a lesson, produces exactly one entry.
- Enrolling in a previously removed course un-hides it.
- An enrolled course shows **Continue Learning**; a completed one shows **Review Course**.
- Signed-out visitors can still read course pages; the button routes to sign-in and writes nothing.
- Existing completion, reset, and remove behaviour is unchanged.
- No new dependency; reuse `Button` and the existing Tailwind tokens.

## Security considerations

- `enroll-course` inherits the route's rule: **`userId` from `auth()`, body's ignored.**
- `courseId` validated by the existing `isDocumentId` before use.
- The write token stays server-only in `sanity/lib/write-client.ts`; the enroll path adds no new
  import of it.
- Enrollment is not entitlement. It does not grant access to anything gated — free preview remains a
  label, not access control (§7). Say so in a comment so nobody later mistakes it for authorization.
- No Clerk user id in analytics payloads.

## Acceptance criteria

1. Clicking **Enroll** puts the course on My Learning immediately, with no lesson watched.
2. Opening a lesson enrols the learner in its course; the course appears on My Learning.
3. Enrolling twice yields one `enrolledCourses` entry.
4. Enrolling in a removed course removes it from `removedCourses`.
5. The course page button reads Enroll → Continue Learning → Review Course across those states.
6. Signed out, the course page renders and the button does not attempt a write.
7. `grep -rn "startedCourses"` returns nothing outside the prompts directory.
8. Reset still keeps the course visible at 0%; remove still preserves completions.
9. Type check, lint, and build pass; typegen regenerated; Studio schema deploys.

## Checks to run

Web (repo root): `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run typegen`, `npm run dev`.
Studio (`studio/`): `npx sanity schema deploy`.

Before the rename, run `count(*[_type == "progress"])` against the dataset and record the result
(decision 2). Re-run the live-dataset lifecycle verification afterwards, extended to cover enroll.

## Manual test steps

1. Sign in. Find a course not on My Learning. Confirm its button reads **Enroll**.
2. Click Enroll → button becomes **Continue Learning**; `/my-learning` now lists the course at 0%.
3. Reload → still listed. Enrollment persisted.
4. Remove it from My Learning via the ⋮ menu, return to the course page, Enroll again → it reappears.
5. Find another course not enrolled. Click Continue Learning / open a lesson directly → the course
   appears on My Learning without watching to 90%. **This is the reported bug; it must now pass.**
6. Watch a lesson past 90% → percentage rises, course stays enrolled.
7. Reset progress from the ⋮ menu → 0%, still listed, still enrolled.
8. Complete every lesson → button reads **Review Course**.
9. Sign out → the course page renders; the button routes to sign-in and posts nothing (check Network).
10. `curl -X POST localhost:3000/api/progress -d '{"action":"enroll-course","courseId":"x"}'` with no
    session → 401.
