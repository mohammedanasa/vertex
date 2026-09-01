import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getCourseLessonIds, getProgressRecord } from "@/sanity/lib/data";
import { getWriteClient } from "@/sanity/lib/write-client";

/**
 * The one route that writes learner progress (AGENTS.md §5: any write goes
 * through a server route with a write token; the browser never writes).
 *
 * The actions share a route so the auth check, the write client, and the
 * validation live in one place rather than being repeated for each.
 *
 * NOTE: enrollment is not entitlement. Being enrolled puts a course on My
 * Learning; it grants access to nothing. Free preview remains a label, not
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
] as const;
type Action = (typeof ACTIONS)[number];

/** How many times a lost read-modify-write race is retried before giving up. */
const MAX_ATTEMPTS = 3;

function isAction(value: unknown): value is Action {
  return (
    typeof value === "string" && (ACTIONS as readonly string[]).includes(value)
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

  const { action, courseId, lessonId, seconds } = (body ?? {}) as {
    action?: unknown;
    courseId?: unknown;
    lessonId?: unknown;
    seconds?: unknown;
  };

  if (!isAction(action)) {
    return NextResponse.json(
      { error: `'action' must be one of: ${ACTIONS.join(", ")}.` },
      { status: 400 },
    );
  }
  if (!isDocumentId(courseId)) {
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

  const client = getWriteClient();

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const record = await getProgressRecord(userId);
      const state = toState(record);
      let next: ProgressState;

      if (action === "enroll-course") {
        // Enrolling also un-hides: a learner who removed a course and then
        // deliberately enrols again plainly means to see it, and leaving it
        // hidden would look broken. Idempotent — enrolling twice is one entry.
        next = {
          ...state,
          enrolledCourses: withValue(state.enrolledCourses, courseId),
          removedCourses: withoutValues(
            state.removedCourses,
            new Set([courseId]),
          ),
        };
      } else if (action === "save-position") {
        // Checkpoints where the learner is, without claiming they finished.
        // Distinct from complete-lesson on purpose: pausing or navigating away
        // records a resume point, it does not mark the lesson done.
        const id = lessonId as string;
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
          enrolledCourses: withValue(state.enrolledCourses, courseId),
        };
      } else if (action === "complete-lesson") {
        const id = lessonId as string;
        const positions = state.lastPositions.filter((p) => p.lessonId !== id);
        if (typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0) {
          positions.push({ lessonId: id, seconds: Math.floor(seconds) });
        }

        next = {
          completedLessons: withValue(state.completedLessons, id),
          lastPositions: positions,
          enrolledCourses: withValue(state.enrolledCourses, courseId),
          removedCourses: state.removedCourses,
        };
      } else if (action === "remove-course") {
        // Hides the course. Completion data is deliberately kept, so reopening
        // the course restores the learner's history.
        next = {
          ...state,
          removedCourses: withValue(state.removedCourses, courseId),
        };
      } else {
        // reset-course: wipe this course's completions and positions, keep it
        // on My Learning, and un-hide it if it had been removed.
        //
        // The lesson list is resolved server-side from the course; a
        // client-supplied list could name lessons in other courses.
        const courseLessons = new Set(await getCourseLessonIds(courseId));

        next = {
          completedLessons: withoutValues(state.completedLessons, courseLessons),
          lastPositions: state.lastPositions.filter(
            (p) => !courseLessons.has(p.lessonId),
          ),
          // Reset means "start this course over", not "forget I opened it" —
          // the enrolledCourses entry stays so the card remains at 0%.
          enrolledCourses: withValue(state.enrolledCourses, courseId),
          removedCourses: withoutValues(
            state.removedCourses,
            new Set([courseId]),
          ),
        };
      }

      if (!record?._id) {
        await client.create({ _type: "progress", userId, ...next });
        return NextResponse.json({ ok: true });
      }

      try {
        await client
          .patch(record._id)
          .ifRevisionId(record._rev)
          .set(next)
          .commit({ autoGenerateArrayKeys: true });
        return NextResponse.json({ ok: true });
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
