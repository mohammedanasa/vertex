/**
 * Event names and shared property shapes for PostHog.
 *
 * Centralized so a rename cannot drift between call sites: the search page, the
 * server pipeline and the result cards all have to agree on a name for a funnel
 * to join up, and a typo in one of them fails silently at runtime.
 *
 * Naming follows PostHog's convention — snake_case `object_verb`, past tense —
 * and property names are shared across events on purpose (`lesson_slug` is
 * never `lessonSlug` or `slug` somewhere else), so a single filter works across
 * the whole funnel.
 *
 * Slugs are authored catalog content, not user data. The Clerk user id is the
 * only identifier, and it travels as the distinct id, not a property. Names and
 * emails never appear in an event payload.
 *
 * Search text *is* captured, deliberately: what learners ask the catalog is
 * product feedback — it drives what content to commission and shows where search
 * fails — and it is not personal data in the way a name or an email is. It goes
 * through `normalizeQueryProperty()` so it groups cleanly and stays bounded.
 */

export const ANALYTICS_EVENTS = {
  /** Search text submitted in the UI — intent, before the pipeline runs. */
  SEARCH_SUBMITTED: "search_submitted",
  /** A search actually executed. Captured server-side, where it happens. */
  SEARCH_PERFORMED: "search_performed",
  /** The pipeline errored or was unconfigured, rather than matching nothing. */
  SEARCH_FAILED: "search_failed",
  /** The results page rendered. */
  SEARCH_RESULTS_VIEWED: "search_results_viewed",
  /** A search that matched nothing — a product failure worth its own event. */
  SEARCH_NO_RESULTS: "search_no_results",
  /** A result card was opened. */
  SEARCH_RESULT_OPENED: "search_result_opened",
  /** The sort control changed. */
  SEARCH_SORT_CHANGED: "search_sort_changed",

  /** Playback started. */
  VIDEO_PLAYED: "video_played",
  /** A watch-depth milestone was crossed. Approximate — see lesson-video.tsx. */
  VIDEO_PLAYBACK_PROGRESSED: "video_playback_progressed",

  /** A lesson was watched far enough to count as finished. */
  LESSON_COMPLETED: "lesson_completed",
  /** Previous/Next used to move through a course. */
  LESSON_NAVIGATED: "lesson_navigated",

  /** A learner picked a course or lesson back up. */
  RESUME_USED: "resume_used",
} as const;

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Where a search was typed. */
export type SearchSubmitSource = "hero" | "results_page";

/** Which caller ran the search pipeline. */
export type SearchRunSource = "page" | "api";

/** Which affordance resumed a course or lesson. */
export type ResumeSource =
  | "course_cta"
  | "course_progress_bar"
  | "search_video_result"
  | "lesson_nav";

/**
 * Watch-depth milestones, in percent of the lesson's authored duration.
 *
 * 90 rather than 100 because trailing credits and outros mean a learner who has
 * genuinely finished a lesson rarely reaches the last few seconds.
 */
export const WATCH_DEPTH_MILESTONES = [25, 50, 75, 90] as const;

/** The milestone at which a lesson counts as completed. */
export const COMPLETION_MILESTONE = 90;

/**
 * Longest query text kept on an event.
 *
 * Search itself accepts more (`MAX_QUERY_LENGTH` in `lib/search/search.ts`), but
 * an analytics property does not need the tail of a pasted paragraph, and an
 * unbounded string on a high-volume event is worth avoiding.
 */
const MAX_QUERY_PROPERTY_LENGTH = 120;

/**
 * Normalizes a search phrase for use as an event property.
 *
 * Trimmed, lowercased, and internal whitespace collapsed, so "React Hooks",
 * "react hooks" and "react  hooks" aggregate as one value in PostHog instead of
 * splintering into three rows in a top-searches breakdown.
 *
 * Pair it with `query_length`, which stays measured on the real query — the
 * truncated property would otherwise misreport how long a search actually was.
 */
export function normalizeQueryProperty(query: string): string {
  return query
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_QUERY_PROPERTY_LENGTH);
}
