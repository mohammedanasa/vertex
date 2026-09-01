import "server-only";

/**
 * Learner progress — PLACEHOLDER.
 *
 * AGENTS.md §7 marks My Learning as a presentational surface that "may read
 * existing progress for display", and §8 describes the progress record that
 * will eventually hold it: a document keyed by the Clerk user id, listing the
 * lessons a learner completed and their last position in a lesson, written only
 * through a server route.
 *
 * That document does not exist yet. `studio/schemaTypes/index.ts` has no
 * `progress` type and there is no `app/api/progress/` route, so there is
 * nothing to read. Rather than scatter another hardcoded percentage — the
 * pattern `components/course/course-progress-bar.tsx` already fell into — every
 * caller goes through `getCourseProgress` below, and replacing this one
 * function with a real Sanity read is the whole of the later backend task.
 *
 * Server-only on purpose: progress is derived here and shipped to the browser
 * as rendered output, never as logic the client re-runs (§5).
 */

/** A learner's state in one course. Shaped the way a real read would return it. */
export interface CourseProgress {
  /** Lessons the learner has finished. */
  completedLessons: number;
  /** Lessons in the course, carried alongside so callers need no second lookup. */
  totalLessons: number;
  /** Completion as a whole percent, 0–100. */
  percentComplete: number;
  /** True once every lesson is done. */
  isComplete: boolean;
  /** False when the learner has never opened the course — it stays off My Learning. */
  hasStarted: boolean;
}

/**
 * A small deterministic hash (FNV-1a).
 *
 * Deterministic rather than random so a learner's percentages do not reshuffle
 * between the server render and a refresh. Once real progress lands this goes
 * with the rest of the placeholder.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Reads one course's progress for a learner.
 *
 * PLACEHOLDER BEHAVIOUR: derives a stable pseudo-state from the user and course
 * ids. Roughly a quarter of courses come back unstarted, so My Learning has
 * something to exclude and the catalog does not simply reappear there.
 *
 * The real implementation fetches the learner's progress document, counts the
 * completed lesson ids that belong to this course, and keeps this signature.
 */
export function getCourseProgress(
  userId: string,
  courseId: string,
  totalLessons: number,
): CourseProgress {
  if (totalLessons <= 0) {
    return {
      completedLessons: 0,
      totalLessons: 0,
      percentComplete: 0,
      isComplete: false,
      hasStarted: false,
    };
  }

  const seed = hash(`${userId}:${courseId}`);

  // 0–3; a 0 means "never opened", so ~25% of courses stay off the page.
  const bucket = seed % 4;
  if (bucket === 0) {
    return {
      completedLessons: 0,
      totalLessons,
      percentComplete: 0,
      isComplete: false,
      hasStarted: false,
    };
  }

  // Anything started has at least one lesson done, and can reach all of them.
  const completedLessons = 1 + ((seed >>> 8) % totalLessons);
  const percentComplete = Math.round((completedLessons / totalLessons) * 100);

  return {
    completedLessons,
    totalLessons,
    percentComplete,
    isComplete: completedLessons >= totalLessons,
    hasStarted: true,
  };
}
