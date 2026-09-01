import { BookmarkButton } from "@/components/ui/bookmark-button";

/**
 * Thin alias kept so the lesson page's call site reads in its own terms.
 * Behavior lives in the shared button.
 */
export function LessonBookmarkButton({ lessonSlug }: { lessonSlug: string }) {
  return <BookmarkButton kind="lesson" slug={lessonSlug} />;
}
