import { ArrowRightIcon } from "@/components/icons";
import { CourseResumeLink } from "@/components/course/course-resume-link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Container } from "@/components/ui/container";

const PLACEHOLDER_PROGRESS = 35;

export function CourseProgressBar({
  continueHref,
  courseSlug,
  continueLessonSlug,
}: {
  continueHref: string;
  courseSlug: string;
  continueLessonSlug: string | null;
}) {
  return (
    <div className="sticky bottom-0 border-t border-neutral-200 bg-surface shadow-lg">
      <Container className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:max-w-md">
          <p className="text-body font-medium text-neutral-900">Your Progress</p>
          <ProgressBar value={PLACEHOLDER_PROGRESS} />
        </div>
        <CourseResumeLink
          href={continueHref}
          source="course_progress_bar"
          courseSlug={courseSlug}
          lessonSlug={continueLessonSlug}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
        >
          Continue Learning
          <ArrowRightIcon className="size-5" />
        </CourseResumeLink>
      </Container>
    </div>
  );
}
