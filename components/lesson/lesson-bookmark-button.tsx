import { BookmarkButton } from "@/components/ui/bookmark-button";

/**
 * Thin alias kept so the lesson page's call site reads in its own terms.
 * Behavior lives in the shared button.
 */
export function LessonBookmarkButton({
  lessonId,
  lessonSlug,
  initialBookmarked,
  isSignedIn,
}: {
  lessonId: string;
  lessonSlug: string;
  initialBookmarked?: boolean;
  isSignedIn?: boolean;
}) {
  return (
    <BookmarkButton
      kind="lesson"
      id={lessonId}
      slug={lessonSlug}
      initialBookmarked={initialBookmarked}
      isSignedIn={isSignedIn}
    />
  );
}
