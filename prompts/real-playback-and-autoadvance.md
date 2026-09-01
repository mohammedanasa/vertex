# Implementation Prompt — Real Playback Tracking and Auto-Advance

## Goal

Two user-reported items that share one root cause:

1. **Bug:** "I have enrolled to the course and completed the first video, however, it's not showing
   the progress." Screenshot confirms it — lesson 1.2 playing, sidebar reads "0% complete", and
   lesson 1.1 has no completion mark.
2. **Feature:** when a lesson finishes, show a popup about the next lesson and advance to it.

## Diagnosis of the bug

Verified against the live dataset. The learner's progress document exists and enrollment worked:

```
userId: user_3IUuLQ23dGAvATWlKbfAmD49Phu
enrolledCourses: ["course.building-ai-apps-with-llms"]
completedLessons: []        <-- empty
lastPositions: []           <-- empty
```

So the write path and the token are fine. **The completion write never fired.**

Why, in `components/lesson/lesson-video.tsx`:
- The embed is a plain iframe with no `enablejsapi` (`lib/video.ts:49` builds the URL; the component
  says so at line 53). There is no way to read the player's real position.
- Depth is therefore estimated from **wall-clock time since the play click** (line 135:
  `elapsed = (Date.now() - playStartedAt.current) / 1000`).
- Completion requires `percent >= COMPLETION_MILESTONE` (90) **and**
  `elapsed >= durationSeconds * 0.1` (line 168).

For the 8-minute lesson in the screenshot, `percent >= 90` needs roughly **7 minutes 12 seconds of
real elapsed time with the tab open and the interval running**. Watching the video faster, skipping
ahead, or leaving before that point records nothing at all. There is also **no write on unmount**,
so navigating away mid-lesson discards everything — which is why `lastPositions` is empty too.

The estimate also counts paused, scrubbed-back, and backgrounded time, so it is both too strict in
practice and inaccurate in principle. The existing comment at line 60 already names the fix:
"Swapping in the YouTube IFrame Player API would make them real."

**Auto-advance depends on the same missing capability.** A reliable "the video ended" signal does
not exist today; a wall-clock timer would fire at the wrong moment.

Scope confirmed with the user:
- **Adopt the YouTube IFrame Player API** for real position and a real `ENDED` event.
- **Countdown overlay with cancel** when a lesson ends.
- **Course-complete panel** on the final lesson, where there is no next.

## Skills / docs read

- `AGENTS.md` — §5 (writes go through the server route; browser never writes directly to Sanity),
  §7 (playback stays on-site through the provider's own embed; **do not build a custom player**;
  progress surfaces as completion marks and a resume affordance), §12, §13.
- `node_modules/next/dist/docs/` — client components, script loading, and `useRouter`. Confirm the
  current router API before writing; AGENTS.md warns this Next.js version differs from training data.
- YouTube IFrame Player API reference — for `onStateChange`, `YT.PlayerState.ENDED`,
  `getCurrentTime()`, `getDuration()`, and the `origin` parameter. **Read the current docs rather
  than writing from memory.**

## Code inspected

**The player:**
- `components/lesson/lesson-video.tsx` — click-to-play poster, then a plain iframe (line 242) whose
  src comes from `buildYouTubeEmbedUrl`. Refs: `firedMilestones`, `firedCompletion`,
  `playStartedAt`. `beginWatchTracking()` (line 98) seeds already-passed milestones so a deep link
  to 9:10 of a 10:00 lesson does not instantly report completion — **that guard must survive the
  rewrite**, it is protecting a real case.
- `lib/video.ts:49` — `buildYouTubeEmbedUrl(videoId, {startSeconds, autoplay})`, sets
  `rel=0`, `modestbranding=1`, host `youtube-nocookie.com`.
- `lib/analytics/events.ts` — `WATCH_DEPTH_MILESTONES = [25,50,75,90]`, `COMPLETION_MILESTONE = 90`.
  Event properties are currently named `approx_percent_watched` / `is_estimate: true` because the
  numbers were estimates. **With the real API they stop being estimates — rename accordingly and
  drop `is_estimate`, rather than shipping events that lie in the other direction.**

**Available for auto-advance, no new query needed:**
- `sanity/lib/data.ts` `getLessonBySlug` already derives `course.nextLesson` and
  `course.previousLesson` from a flattened lesson list that **crosses module boundaries** (the last
  lesson of module 4 precedes the first of module 5). `app/lessons/[slug]/page.tsx:266-267` already
  passes them to `LessonNav`. The next-lesson target is free.

**The write path (unchanged by this task):**
- `app/api/progress/route.ts` — `enroll-course`, `complete-lesson`, `remove-course`, `reset-course`.
  `complete-lesson` already accepts an optional `seconds` and stores it in `lastPositions`.

## Decisions and assumptions

1. **Load the IFrame Player API and drive the embed through it.** This is still YouTube's own player
   rendered on the lesson page, so §7's "provider embed, no custom player, never send the learner
   out" holds. What changes is that the page can now *ask* the player where it is.
   - Load `https://www.youtube.com/iframe_api` once per page, guarding against double-injection
     across client navigations (the API is a global singleton and `onYouTubeIframeAPIReady` is a
     single global callback — a naive second load clobbers it).
   - Keep `youtube-nocookie.com` as the host and pass `origin` so the API accepts the messages.
   - **Fallback:** if the API fails to load (blocked script, offline), fall back to the current
     wall-clock estimate rather than losing tracking entirely. Playback must never break because an
     analytics/progress mechanism could not initialise.
2. **Completion becomes real and reachable.** Judge it on `getCurrentTime()/getDuration()`, plus a
   genuine `ENDED` state, which counts as complete unconditionally.
   - Keep a minimum-watched guard so a deep link to 95% that is immediately abandoned does not
     count, but base it on *player time actually advanced*, not wall-clock.
   - Preserve the `beginWatchTracking` seeding behaviour for deep links.
3. **Persist on the way out, not only at the threshold.** Write `lastPositions` when the learner
   pauses, navigates away (`pagehide`/`visibilitychange`), or unmounts. This is why `lastPositions`
   is empty today and why resume never had anything to resume to.
   - Throttle: no more than one position write per ~15s of playback, so a long lesson does not
     hammer the route.
   - **Do not** send a completion twice; the existing `firedCompletion` ref still guards that.
4. **Auto-advance overlay on `ENDED`.** A panel over the player showing the next lesson's title and
   duration, a ~5 second countdown, **Play now**, and **Cancel**.
   - Cancel stops the countdown permanently for that lesson — a learner who cancels and keeps
     reading must not be yanked away later.
   - Pause the countdown when the tab is hidden, so someone who switches away does not return to
     find themselves three lessons along.
   - Respect `prefers-reduced-motion` for the countdown animation, and make the overlay keyboard
     dismissible with `Escape`.
   - Navigate with the router, client-side; do not full-page reload.
5. **Final lesson shows a course-complete panel** instead of a countdown: a short confirmation with
   links to the course page and My Learning. `course.nextLesson === null` is the condition, already
   computed server-side.
6. **Completion must be persisted before navigating away.** The overlay navigates on a timer, and an
   in-flight `fetch` can be cancelled by the navigation. Await the completion write (or use
   `sendBeacon`) before routing, otherwise the auto-advance reintroduces exactly the bug this task
   fixes. **This is the subtle failure mode to watch for.**
7. **Progress must be visible without a manual reload.** After a completion write, call
   `router.refresh()` so the sidebar percentage and the check marks update. Today even a successful
   write would not repaint the sidebar.
8. **Analytics:** keep the existing events; correct the property names now that the numbers are
   real (`percent_watched`, drop `is_estimate`). Add `LESSON_AUTO_ADVANCED` with a property
   distinguishing an expired countdown from a "Play now" click, and capture a cancel so the feature's
   annoyance can actually be measured. No Clerk id in payloads.

## Files expected to touch

**New**
- `components/lesson/lesson-autoadvance-overlay.tsx` — countdown / course-complete panel.
- `lib/youtube-player.ts` — API loader + typed wrapper, with the double-load guard.

**Modified**
- `components/lesson/lesson-video.tsx` — drive the player through the API; real depth; position
  persistence; emit an end event. The bulk of the work.
- `lib/video.ts` — `buildYouTubeEmbedUrl` gains `enablejsapi` and `origin`.
- `app/lessons/[slug]/page.tsx` — pass `nextLesson` (slug, title, duration) into the player.
- `lib/analytics/events.ts` — add `LESSON_AUTO_ADVANCED`; correct the estimate-era property names.

**Explicitly not touched**
- `app/api/progress/route.ts` — `complete-lesson` already takes `seconds`; no route change needed.
- The Sanity schema — no new fields.
- `components/lesson/lesson-nav.tsx` — manual Previous/Next stays as it is.

## Requirements

- Watching a lesson to the end marks it complete, and the sidebar shows the check mark and a raised
  percentage **without a manual reload**.
- Completion is reachable in normal use — watching the actual video, not keeping a tab open for 90%
  of its duration in wall-clock time.
- Leaving mid-lesson stores a resume position.
- On end: an overlay naming the next lesson, a visible countdown, Play now, and Cancel. Cancel
  prevents navigation for that lesson.
- On the final lesson: a course-complete panel, no countdown.
- If the IFrame API cannot load, playback still works and tracking degrades to the current estimate.
- Deep links (`?t=` / `?startSeconds=`) still start at the offset and still do not falsely complete.
- Signed-out learners can watch; no write is attempted (`lessonId`/`courseId` are already null).

## Security considerations

- No change to the write path: still `POST /api/progress`, `userId` from `auth()`, body's ignored.
- `videoId` continues to go through `parseYouTubeId`; never interpolate an authored URL into a
  player config.
- Set `origin` on the embed so the API does not accept postMessage from arbitrary frames.
- The injected YouTube script is a third-party dependency on the lesson page. It is the provider's
  own player, consistent with §7, but note it in the report — it was previously only an iframe.
- No Clerk id in analytics payloads.

## Acceptance criteria

1. Watch a short lesson to the end → `completedLessons` contains its id, and the sidebar updates
   without a reload.
2. The 8-minute lesson from the report completes by watching it, not by waiting ~7m12s.
3. Leaving mid-lesson writes a `lastPositions` entry.
4. On end, the overlay appears with the correct next lesson; the countdown expires and navigates.
5. Cancel stops the countdown, and it does not resume.
6. The final lesson shows the course-complete panel and never navigates on its own.
7. Completion is persisted before auto-advance navigates (verify the document, not just the UI).
8. With the YouTube script blocked, the video still plays.
9. A deep link to ~95% does not instantly mark the lesson complete.
10. Type check, lint, and build pass.

## Checks to run

Repo root: `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run dev`.
No typegen (no query change) and no Studio deploy (no schema change).

After implementing, re-run the dataset check to confirm a real completion lands:
`*[_type=="progress"]{userId, completedLessons, lastPositions}`.

## Manual test steps

1. `npm run dev`, sign in, open a **short** lesson in an enrolled course.
2. Let it play to the end → overlay appears naming the next lesson with a countdown.
3. Let the countdown expire → lands on the next lesson.
4. Go back → the finished lesson has a check mark and the sidebar percentage is above 0%.
5. **This is the reported bug — it must now pass.**
6. Query the dataset → `completedLessons` contains the lesson id.
7. Start another lesson, watch part of it, navigate away → `lastPositions` has an entry.
8. Finish a lesson and hit **Cancel** → no navigation, and none later either.
9. Switch tabs mid-countdown → it pauses rather than advancing behind your back.
10. Open the last lesson of a course and finish it → course-complete panel, no countdown.
11. Open a lesson with `?t=` near the end → starts there, does not instantly complete.
12. Block `youtube.com/iframe_api` in devtools, reload → the video still plays.
13. Resize to 1440 / 768 / 375 → the overlay fits the player and its buttons stay reachable.

---

## Implementation notes (added during the build)

**One deviation from the plan.** This prompt said `app/api/progress/route.ts` needed no change
because `complete-lesson` already accepted a `seconds` value. That was wrong: reusing it to
checkpoint a position would have marked the lesson **complete** every time the learner paused or
navigated away — a worse bug than the one being fixed. Added a separate `save-position` action that
records `lastPositions` and enrolls, without touching `completedLessons`. Verified against the live
dataset that it does not mark completion (8/8 assertions).

**Position writes use `sendBeacon` on the way out.** A normal `fetch` is cancelled when the page is
torn down, which is a large part of why `lastPositions` was always empty. `pagehide` and
`visibilitychange` checkpoint through `navigator.sendBeacon`, the one transport the browser commits
to delivering; in-playback writes stay on `fetch` with `keepalive`.

**Watched time only counts forward movement.** `sample()` accumulates the positive delta between
samples and ignores jumps over 30s, so scrubbing backwards and re-watching does not inflate the
total, and a seek forward does not award credit for video that was skipped.

**Analytics properties renamed.** `approx_percent_watched` → `percent_watched`,
`approx_seconds_watched` → `seconds_watched`, and `is_estimate` is gone. `completion_source` now
reports `player_position` or `wall_clock_estimate` so the fallback path stays distinguishable in
PostHog. Any saved insight filtering on the old names needs updating.

**The YouTube script is a new third-party dependency** on the lesson page, where previously there
was only an iframe. It is the provider's own player, consistent with AGENTS.md §7, and the page
falls back to the plain iframe if it cannot load.

---

## Follow-up: autoplay on arrival (user request)

Auto-advance navigated to the next lesson but landed on the click-to-play poster, which defeats the
point. The next lesson now starts on its own.

- `advance()` navigates to `/lessons/<slug>?autoplay=1`, and the lesson page passes that through to
  the player as an `autoplay` prop. Kept **separate from `startSeconds`**: that param means "seek to
  this moment" (search deep links), while this means "begin at the top, already playing". Overloading
  `startSeconds` would have made every auto-advance look like a search hit in analytics.
- Only the exact string `1` enables it, so `?autoplay=0` and junk values fall through to the poster
  rather than autoplaying on anything truthy. Verified all four cases over HTTP.

**Autoplay can be refused by the browser.** Playback with sound needs a recent user gesture: clicking
"Play now" supplies one, but a countdown that merely expired may not, which would leave the learner
on a dead player. `onReady` now checks ~1.2s after `playVideo()` whether the state is actually
PLAYING, and if not restores the poster so there is something to click. The subsequent click clears
the flag and remounts the player, and it is that click which satisfies the gesture requirement.

---

## Bug fix: removeChild crash when seeking

Reported: `NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a
child of this node`, when forwarding the video.

**Cause.** `new YT.Player(el)` does not render *into* the element it is given — it **replaces** it
with an iframe. The element handed over was React-rendered (`<div ref={mountRef}>`), so React's
virtual tree and the real DOM disagreed from the moment the player initialised. Any later unmount of
that branch made React call `removeChild` on a node YouTube had already destroyed.

Seeking triggered it because of a second bug sitting on top: the autoplay-refusal check treated
"not PLAYING 1.2s after load" as a refusal, and a forward seek puts the player in **BUFFERING**. So
scrubbing ahead flipped `autoplayBlocked`, unmounted the player branch mid-watch, and hit the
desynchronised node.

**Fixes:**
1. React owns a stable empty wrapper and never puts children in it. The effect creates a throwaway
   `host` div inside, hands *that* to the API, and cleanup empties the wrapper directly. React's
   tree and the DOM can no longer disagree.
2. The autoplay check now only treats `UNSTARTED` and `CUED` as a refusal — never `BUFFERING` — and
   bails out entirely once any playback has been recorded, so it cannot fire mid-watch. Window
   widened to 2s and the timer is cleared on cleanup.
3. `onError` no longer swaps to the fallback iframe once playback has started; doing so mid-watch
   would have replaced the branch and restarted the video from the top.
4. Both render branches carry a `key`, so swapping player↔fallback remounts rather than letting
   React reuse one element as a different tag.
5. The wrapper node is captured in a local at effect start rather than read from the ref during
   cleanup (the `react-hooks/exhaustive-deps` warning was pointing at a real stale-node hazard), and
   the post-load guard checks `host.isConnected`.
