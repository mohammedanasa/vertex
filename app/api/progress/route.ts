import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCourseLessonIds, getProgressRecord } from "@/sanity/lib/data";
import { getWriteClient } from "@/sanity/lib/write-client";

/**
 * The one route that writes learner state — progress and bookmarks (AGENTS.md
 * §5: any write goes through a server route with a write token; the browser
 * never writes).
 *
 * The actions share a route so the auth check, the write client, and the
 * validation live in one place rather than being repeated for each.
 *
 * NOTE: enrollment is not entitlement. Being enrolled puts a course on My
 * Learning; it grants access to nothing. Bookmarking grants even less — it does
 * not enroll and does not reach My Learning. Free preview remains a label, not
 * access control (§7). Do not grow this into an authorization check.
 *
 * SECURITY: the learner is taken from `auth()` on the server and the request
 * body's user id — if a caller sends one — is ignored entirely. Trusting a
 * body-supplied id would let any caller rewrite another learner's progress.
 *
 * ## Why this reads, computes, then `set`s whole arrays
 *
 * The obvious implementation chains `.append()` and `.unset()` in one patch to
 * add an entry and trim duplicates. That silently does the wrong thing: Sanity
 * applies patch operations in a fixed order (unset before insert), not in call
 * order, so a dedupe `unset` evaluates against the pre-append array. Verified
 * against the live dataset — completing a lesson twice duplicated it, and the
 * reset patch's unsets wiped entries its appends had just added.
 *
 * Reading the current arrays and writing back computed ones is deterministic
 * and obvious. It also means no id is ever interpolated into a GROQ filter
 * path, so the write path has no query-injection surface at all.
 *
 * The cost is a read-modify-write race if one learner mutates their progress
 * from two tabs at once. `ifRevisionId` makes the write fail rather than
 * clobber, and the caller retries — losing a race is fine, losing data is not.
 */

// The Sanity write client needs Node APIs, and a write must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = [
  "enroll-course",
  "save-position",
  "complete-lesson",
  "remove-course",
  "reset-course",
  "toggle-bookmark",
] as const;
type Action = (typeof ACTIONS)[number];

/**
 * Actions that operate on a course and therefore require a valid `courseId`.
 *
 * `toggle-bookmark` is the one action that may target a lesson instead, so the
 * check is per-action rather than blanket. Every pre-existing action stays in
 * this list: relaxing the rule must not weaken what they already guarantee.
 */
const COURSE_ACTIONS: ReadonlySet<Action> = new Set([
  "enroll-course",
  "save-position",
  "complete-lesson",
  "remove-course",
  "reset-course",
]);

const BOOKMARK_KINDS = ["course", "lesson"] as const;
type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

/** How many times a lost read-modify-write race is retried before giving up. */
const MAX_ATTEMPTS = 3;

function isAction(value: unknown): value is Action {
  return (
    typeof value === "string" && (ACTIONS as readonly string[]).includes(value)
  );
}

function isBookmarkKind(value: unknown): value is BookmarkKind {
  return (
    typeof value === "string" &&
    (BOOKMARK_KINDS as readonly string[]).includes(value)
  );
}

/**
 * Sanity document ids are bounded and character-restricted. Rejecting anything
 * else keeps junk out of the arrays a learner accumulates over time.
 */
function isDocumentId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[A-Za-z0-9._-]+$/.test(value)
  );
}

/** Appends to a string array without duplicating. */
function withValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

/** Removes every occurrence, which also collapses any pre-existing duplicates. */
function withoutValues(
  list: readonly string[],
  remove: ReadonlySet<string>,
): string[] {
  return list.filter((item) => !remove.has(item));
}

interface ProgressState {
  completedLessons: string[];
  lastPositions: { lessonId: string; seconds: number }[];
  enrolledCourses: string[];
  removedCourses: string[];
  bookmarkedCourses: string[];
  bookmarkedLessons: string[];
}

/** Normalizes a fetched record into plain arrays, tolerating missing fields. */
function toState(record: Awaited<ReturnType<typeof getProgressRecord>>) {
  const strings = (v: readonly (string | null)[] | null | undefined) =>
    (v ?? []).filter((s): s is string => typeof s === "string");

  return {
    completedLessons: strings(record?.completedLessons),
    lastPositions: (record?.lastPositions ?? []).flatMap((p) =>
      p?.lessonId && typeof p.seconds === "number"
        ? [{ lessonId: p.lessonId, seconds: p.seconds }]
        : [],
    ),
    enrolledCourses: strings(record?.enrolledCourses),
    removedCourses: strings(record?.removedCourses),
    bookmarkedCourses: strings(record?.bookmarkedCourses),
    bookmarkedLessons: strings(record?.bookmarkedLessons),
  } satisfies ProgressState;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, courseId, lessonId, seconds, kind } = (body ?? {}) as {
    action?: unknown;
    courseId?: unknown;
    lessonId?: unknown;
    seconds?: unknown;
    kind?: unknown;
  };

  if (!isAction(action)) {
    return NextResponse.json(
      { error: `'action' must be one of: ${ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }
  if (COURSE_ACTIONS.has(action) && !isDocumentId(courseId)) {
    return NextResponse.json(
      { error: "A valid 'courseId' is required." },
      { status: 400 },
    );
  }
  if (
    (action === "complete-lesson" || action === "save-position") &&
    !isDocumentId(lessonId)
  ) {
    return NextResponse.json(
      { error: "A valid 'lessonId' is required." },
      { status: 400 },
    );
  }
  if (action === "toggle-bookmark") {
    // `kind` selects which array is written. It is checked against a literal
    // union and then used only through a fixed if/else below — never to index
    // into the document, which would let a caller name an arbitrary field.
    if (!isBookmarkKind(kind)) {
      return NextResponse.json(
        { error: "'kind' must be 'course' or 'lesson'." },
        { status: 400 },
      );
    }
    if (!isDocumentId(kind === "course" ? courseId : lessonId)) {
      return NextResponse.json(
        {
          error: `A valid '${kind === "course" ? "courseId" : "lessonId"}' is required.`,
        },
        { status: 400 },
      );
    }
  }

  // Validation above has already rejected anything invalid for this action.
  // Binding narrowed locals here keeps the branches below honest about types
  // without re-checking, and makes it explicit that a course action always has
  // a courseId while toggle-bookmark may not.
  const course = isDocumentId(courseId) ? courseId : null;
  const lesson = isDocumentId(lessonId) ? lessonId : null;

  const client = getWriteClient();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const record = await getProgressRecord(userId);
      const state = toState(record);
      let next: ProgressState;
      // Set only by toggle-bookmark, and returned so the client can settle its
      // optimistic state without a refetch.
      let bookmarked: boolean | undefined;

      if (action === "enroll-course") {
        // Enrolling also un-hides: a learner who removed a course and then
        // deliberately enrols again plainly means to see it, and leaving it
        // hidden would look broken. Idempotent — enrolling twice is one entry.
        next = {
          ...state,
          enrolledCourses: withValue(state.enrolledCourses, course!),
          removedCourses: withoutValues(
            state.removedCourses,
            new Set([course!]),
          ),
        };
      } else if (action === "save-position") {
        // Checkpoints where the learner is, without claiming they finished.
        // Distinct from complete-lesson on purpose: pausing or navigating away
        // records a resume point, it does not mark the lesson done.
        const id = lesson!;
        const at =
          typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
            ? Math.floor(seconds)
            : null;

        if (at === null) {
          return NextResponse.json(
            { error: "A non-negative 'seconds' is required." },
            { status: 400 },
          );
        }

        next = {
          ...state,
          lastPositions: [
            ...state.lastPositions.filter((p) => p.lessonId !== id),
            { lessonId: id, seconds: at },
          ],
          // Watching a lesson is enrolling in its course.
          enrolledCourses: withValue(state.enrolledCourses, course!),
        };
      } else if (action === "complete-lesson") {
        const id = lesson!;
        const positions = state.lastPositions.filter((p) => p.lessonId !== id);
        if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
          positions.push({ lessonId: id, seconds: Math.floor(seconds) });
        }

        next = {
          ...state,
          completedLessons: withValue(state.completedLessons, id),
          lastPositions: positions,
          enrolledCourses: withValue(state.enrolledCourses, course!),
        };
      } else if (action === "toggle-bookmark") {
        // Bookmarking is orthogonal to enrollment on purpose: saving a course
        // for later must not start it, list it on My Learning, or grant access
        // to anything. Note the contrast with save-position above, which does
        // enroll. Nothing here touches enrolledCourses or removedCourses.
        const id = kind === "course" ? course! : lesson!;
        const list =
          kind === "course" ? state.bookmarkedCourses : state.bookmarkedLessons;

        // Toggle, so the same request twice is a no-op pair rather than a
        // corruption. withoutValues also collapses any pre-existing duplicates.
        bookmarked = !list.includes(id);
        const updated = bookmarked
          ? withValue(list, id)
          : withoutValues(list, new Set([id]));

        next =
          kind === "course"
            ? { ...state, bookmarkedCourses: updated }
            : { ...state, bookmarkedLessons: updated };
      } else if (action === "remove-course") {
        // Hides the course. Completion data is deliberately kept, so reopening
        // the course restores the learner's history.
        next = {
          ...state,
          removedCourses: withValue(state.removedCourses, course!),
        };
      } else {
        // reset-course: wipe this course's completions and positions, keep it
        // on My Learning, and un-hide it if it had been removed.
        //
        // The lesson list is resolved server-side from the course; a
        // client-supplied list could name lessons in other courses.
        const courseLessons = new Set(await getCourseLessonIds(course!));

        next = {
          ...state,
          completedLessons: withoutValues(state.completedLessons, courseLessons),
          lastPositions: state.lastPositions.filter(
            (p) => !courseLessons.has(p.lessonId),
          ),
          // Reset means "start this course over", not "forget I opened it" —
          // the enrolledCourses entry stays so the card remains at 0%.
          enrolledCourses: withValue(state.enrolledCourses, course!),
          removedCourses: withoutValues(
            state.removedCourses,
            new Set([course!]),
          ),
        };
      }

      if (!record?._id) {
        await client.create({ _type: "progress", userId, ...next });
        return NextResponse.json({ ok: true, bookmarked });
      }

      try {
        await client
          .patch(record._id)
          .ifRevisionId(record._rev)
          .set(next)
          .commit({ autoGenerateArrayKeys: true });
        return NextResponse.json({ ok: true, bookmarked });
      } catch (error) {
        // 409 means someone else wrote between our read and our write. Re-read
        // and recompute rather than overwriting their change.
        const status = (error as { statusCode?: number })?.statusCode;
        if (status !== 409 || attempt === MAX_ATTEMPTS) throw error;
      }
    }

    return NextResponse.json(
      { error: "Could not save progress; please retry." },
      { status: 409 },
    );
  } catch (error) {
    // Never leak the token or the dataset internals to the caller.
    console.error("[api/progress] write failed", error);
    return NextResponse.json(
      { error: "Could not save progress." },
      { status: 503 },
    );
  }
}
