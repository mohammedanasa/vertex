import "server-only";

import { getProgressRecord } from "@/sanity/lib/data";

/**
 * Learner progress (AGENTS.md §7, §8).
 *
 * Reads the learner's `progress` document — app state keyed by the Clerk user
 * id, kept apart from the read-only catalog content the pages render. Writes go
 * through `app/api/progress/route.ts`; nothing here mutates, and none of this
 * reaches the browser (§5).
 *
 * Fetch the record **once** per request with `getProgressForUser`, then derive
 * each course's state from it with `courseProgress`. Do not call the fetch per
 * course — My Learning renders the whole catalog and would issue one query per
 * card.
 */

/** A learner's state in one course. */
export interface CourseProgress {
  /** Lessons the learner has finished. */
  completedLessons: number;
  /** Lessons in the course, carried alongside so callers need no second lookup. */
  totalLessons: number;
  /** Completion as a whole percent, 0–100. */
  percentComplete: number;
  /** True once every lesson is done. */
  isComplete: boolean;
  /**
   * True when the course belongs on My Learning: the learner enrolled and has
   * not removed it.
   *
   * Enrollment is the primary signal, written by the Enroll button and by
   * opening any lesson. The completion and last-position fallbacks below it
   * exist so a learner whose progress predates enrollment is not dropped from
   * the page — and so a reset course, whose completions are cleared, stays
   * visible at 0%.
   *
   * Enrollment is not entitlement: it decides what shows on My Learning, never
   * what a learner may access.
   */
  isEnrolled: boolean;
}

/** A learner's whole progress record, normalized so callers need no null checks. */
export interface LearnerProgress {
  completedLessons: ReadonlySet<string>;
  lastPositions: ReadonlyMap<string, number>;
  enrolledCourses: ReadonlySet<string>;
  removedCourses: ReadonlySet<string>;
}

const EMPTY: LearnerProgress = {
  completedLessons: new Set(),
  lastPositions: new Map(),
  enrolledCourses: new Set(),
  removedCourses: new Set(),
};

/** Drops nulls from an optional string array and returns it as a set. */
function toSet(values: readonly (string | null)[] | null | undefined) {
  return new Set((values ?? []).filter((v): v is string => Boolean(v)));
}

/**
 * Fetches and normalizes one learner's progress. Call once per request.
 *
 * A learner with no record yet is not an error — it is the common case on a
 * first visit — so this returns empty state rather than null, and every caller
 * treats "no record" and "empty record" identically.
 */
export async function getProgressForUser(
  userId: string,
): Promise<LearnerProgress> {
  const record = await getProgressRecord(userId);
  if (!record) return EMPTY;

  const lastPositions = new Map<string, number>();
  for (const entry of record.lastPositions ?? []) {
    if (entry?.lessonId && typeof entry.seconds === "number") {
      lastPositions.set(entry.lessonId, entry.seconds);
    }
  }

  return {
    completedLessons: toSet(record.completedLessons),
    lastPositions,
    enrolledCourses: toSet(record.enrolledCourses),
    removedCourses: toSet(record.removedCourses),
  };
}

/**
 * Derives one course's state from an already-fetched record.
 *
 * `lessonIds` are the course's own lessons, so completion is counted against
 * this course only — a learner's completions in other courses never inflate it.
 */
export function courseProgress(
  progress: LearnerProgress,
  courseId: string,
  lessonIds: readonly string[],
): CourseProgress {
  const totalLessons = lessonIds.length;
  const completedLessons = lessonIds.filter((id) =>
    progress.completedLessons.has(id),
  ).length;

  const removed = progress.removedCourses.has(courseId);
  const enrolled =
    progress.enrolledCourses.has(courseId) ||
    // Fallbacks for progress made before enrollment existed as a concept.
    completedLessons > 0 ||
    lessonIds.some((id) => progress.lastPositions.has(id));

  return {
    completedLessons,
    totalLessons,
    percentComplete:
      totalLessons > 0
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0,
    isComplete: totalLessons > 0 && completedLessons >= totalLessons,
    isEnrolled: enrolled && !removed,
  };
}

/**
 * Convenience for a single course — the course and lesson pages need one
 * course's state and have no reason to hold the whole record.
 */
export async function getCourseProgress(
  userId: string,
  courseId: string,
  lessonIds: readonly string[],
): Promise<CourseProgress> {
  return courseProgress(await getProgressForUser(userId), courseId, lessonIds);
}
