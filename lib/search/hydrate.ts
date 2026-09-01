import "server-only";

import { getLessonsForSearch, getVideoMoments } from "@/sanity/lib/data";

import type {
  LessonResult,
  SearchResult,
  SortOption,
  VideoResult,
} from "./types";
import type { SearchRanking } from "./schema";

/**
 * Turns the model's ranked ids into fully grounded results.
 *
 * Nothing the model wrote is rendered. It contributes ordering and a relevance
 * score; every displayed value is re-read from Sanity here (AGENTS.md §11).
 */

/** Trims a lesson's own prose into a card-sized blurb. */
function toDescription(notesText: string | null | undefined): string {
  const text = (notesText ?? "").trim();
  if (!text) return "";

  // `pt::text` joins blocks with newlines; the first paragraph is the summary.
  const firstParagraph = text.split("\n").find((line) => line.trim()) ?? "";
  const collapsed = firstParagraph.replace(/\s+/g, " ").trim();

  if (collapsed.length <= 160) return collapsed;
  // Cut on a word boundary so the ellipsis never lands mid-word.
  const cut = collapsed.slice(0, 160);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
}

/**
 * Derives "5.1" from array position.
 *
 * The module number is the module's index in `modules`, and the lesson number
 * its index within that module — the same rule `getLessonBySlug` applies for
 * the lesson page, so the two surfaces agree.
 */
function deriveLabel(
  course: {
    moduleTitles?: Array<string | null> | null;
    moduleTitle?: string | null;
    moduleLessonSlugs?: Array<string | null> | null;
  } | null,
  lessonSlug: string | null,
): { moduleNumber: number | null; lessonLabel: string | null } {
  if (!course?.moduleTitle || !course.moduleTitles) {
    return { moduleNumber: null, lessonLabel: null };
  }

  const moduleIndex = course.moduleTitles.indexOf(course.moduleTitle);
  if (moduleIndex === -1) return { moduleNumber: null, lessonLabel: null };

  const moduleNumber = moduleIndex + 1;
  const lessonIndex = (course.moduleLessonSlugs ?? []).indexOf(lessonSlug);

  return {
    moduleNumber,
    lessonLabel:
      lessonIndex === -1 ? null : `${moduleNumber}.${lessonIndex + 1}`,
  };
}

/** Moments taken from any one video, so a single video cannot crowd the page. */
const MAX_MOMENTS_PER_VIDEO = 2;

/**
 * Chapter hits outrank transcript hits for the same lesson.
 *
 * A chapter label is authored and names the topic outright; a transcript hit is
 * a passing mention. AGENTS.md §11 ranks by specificity, so the two are not
 * worth the same. The bonus is small — it reorders moments within a relevance
 * band rather than lifting a weak video above a strong lesson.
 */
const CHAPTER_RELEVANCE_BONUS = 0.05;

/** Trims a transcript chunk into a card-sized blurb. */
function toMomentDescription(text: string | null | undefined): string {
  const collapsed = (text ?? "").replace(/\s+/g, " ").trim();
  if (collapsed.length <= 160) return collapsed;
  const cut = collapsed.slice(0, 160);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}\u2026`;
}

export async function hydrateResults(
  ranking: SearchRanking,
  stems: string[] = [],
): Promise<SearchResult[]> {
  // De-duplicate ids while keeping the model's ordering.
  const seen = new Set<string>();
  const ranked = ranking.results.filter((entry) => {
    if (!entry.lessonId || seen.has(entry.lessonId)) return false;
    seen.add(entry.lessonId);
    return true;
  });

  const ids = ranked.map((r) => r.lessonId);

  // Both reads are independent, so they overlap rather than queue.
  const [lessons, moments] = await Promise.all([
    getLessonsForSearch(ids),
    getVideoMoments(ids, stems, MAX_MOMENTS_PER_VIDEO),
  ]);

  const byId = new Map(lessons.map((lesson) => [lesson._id, lesson]));
  const momentsById = new Map(moments.map((entry) => [entry._id, entry.video]));

  return ranked.flatMap((entry) => {
    const lesson = byId.get(entry.lessonId);
    // A hallucinated id resolves to nothing and is dropped here.
    if (!lesson || !lesson.slug || !lesson.course?.slug) return [];

    const { moduleNumber, lessonLabel } = deriveLabel(lesson.course, lesson.slug);

    // Shared by both kinds, so a lesson and its video moment agree on every
    // detail except the action.
    const base = {
      lessonId: lesson._id,
      lessonTitle: lesson.title ?? "Untitled lesson",
      lessonSlug: lesson.slug,
      description: toDescription(lesson.notesText),
      courseTitle: lesson.course.title ?? "",
      courseSlug: lesson.course.slug,
      courseImage: lesson.course.coverImage ?? null,
      moduleTitle: lesson.course.moduleTitle ?? null,
      moduleNumber,
      lessonLabel,
      relevance: entry.relevance,
      durationSeconds: lesson.duration ?? 0,
    };

    const lessonResult: LessonResult = {
      ...base,
      kind: "lesson",
      keyPoints: (lesson.keyPoints ?? []).filter(
        (point): point is string => typeof point === "string",
      ),
    };

    // Two-stage resolution (AGENTS.md §7): chapters first, and the transcript
    // only when no chapter matched. Chapter labels are clean; transcript text
    // is the noisier backstop, so mixing them would dilute the good matches.
    const video = momentsById.get(lesson._id);
    const chapterHits = (video?.chapterMoments ?? []).filter(
      (m) => typeof m.startSeconds === "number",
    );
    const chunkHits = (video?.chunkMoments ?? []).filter(
      (m) => typeof m.startSeconds === "number",
    );
    const usingChapters = chapterHits.length > 0;
    const hits = usingChapters ? chapterHits : chunkHits;

    const videoResults: VideoResult[] = hits.map((hit) => ({
      ...base,
      kind: "video",
      startSeconds: hit.startSeconds as number,
      // The chapter label names the moment; otherwise the transcript text does.
      // Either way it is authored or spoken content, never model-written.
      description:
        ("label" in hit && hit.label
          ? hit.label
          : toMomentDescription("text" in hit ? hit.text : null)) ||
        base.description,
      thumbnail: lesson.thumbnail ?? null,
      // The design's poster badge shows the lesson's own length.
      clipSeconds: lesson.duration ?? null,
      relevance: usingChapters
        ? Math.min(1, entry.relevance + CHAPTER_RELEVANCE_BONUS)
        : entry.relevance,
    }));

    // Merged, not replaced: the design shows a lesson and its video moment as
    // separate cards, so both are kept.
    return [...videoResults, lessonResult];
  });
}

/**
 * Sorts hydrated results.
 *
 * `relevance` is a stable sort on the score, which keeps the model's ordering
 * for everything it scored equally while still letting the chapter bonus in
 * `hydrateResults` lift a precise video moment above a passing transcript hit.
 */
export function sortResults(
  results: SearchResult[],
  sort: SortOption,
): SearchResult[] {
  const sorted = [...results];

  if (sort === "relevance") {
    sorted.sort((a, b) => b.relevance - a.relevance);
    return sorted;
  }

  if (sort === "title") {
    sorted.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));
  } else if (sort === "duration") {
    sorted.sort((a, b) => a.durationSeconds - b.durationSeconds);
  }
  return sorted;
}

/** Distinct courses across results — the "across N courses" figure. */
export function countCourses(results: SearchResult[]): number {
  return new Set(results.map((r) => r.courseSlug)).size;
}
