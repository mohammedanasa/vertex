import "server-only";

import { getLessonsForSearch } from "@/sanity/lib/data";

import type { SearchResult, SortOption } from "./types";
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

export async function hydrateResults(
  ranking: SearchRanking,
): Promise<SearchResult[]> {
  // De-duplicate ids while keeping the model's ordering.
  const seen = new Set<string>();
  const ranked = ranking.results.filter((entry) => {
    if (!entry.lessonId || seen.has(entry.lessonId)) return false;
    seen.add(entry.lessonId);
    return true;
  });

  const lessons = await getLessonsForSearch(ranked.map((r) => r.lessonId));
  const byId = new Map(lessons.map((lesson) => [lesson._id, lesson]));

  return ranked.flatMap((entry) => {
    const lesson = byId.get(entry.lessonId);
    // A hallucinated id resolves to nothing and is dropped here.
    if (!lesson || !lesson.slug || !lesson.course?.slug) return [];

    const { moduleNumber, lessonLabel } = deriveLabel(lesson.course, lesson.slug);

    return [
      {
        kind: "lesson" as const,
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
        keyPoints: (lesson.keyPoints ?? []).filter(
          (point): point is string => typeof point === "string",
        ),
        durationSeconds: lesson.duration ?? 0,
      },
    ];
  });
}

/** Sorts hydrated results. `relevance` preserves the model's ranking order. */
export function sortResults(
  results: SearchResult[],
  sort: SortOption,
): SearchResult[] {
  if (sort === "relevance") return results;

  const sorted = [...results];
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
