import { ArrowRightIcon, ChevronLeftIcon } from "@/components/icons";
import { LessonNavLink } from "@/components/lesson/lesson-nav-link";
import { formatDuration } from "@/lib/format";

export interface NavLesson {
  title: string | null;
  slug: string | null;
  duration: number | null;
}

/**
 * Previous/Next walk the whole course, so they cross module boundaries. At the
 * first or last lesson the control renders disabled rather than as a dead link.
 */
export function LessonNav({
  previous,
  next,
  currentLessonSlug,
  courseSlug,
}: {
  previous: NavLesson | null;
  next: NavLesson | null;
  currentLessonSlug: string;
  courseSlug: string | null;
}) {
  return (
    <div className="sticky bottom-0 border-t border-neutral-200 bg-surface shadow-lg">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          {previous?.slug ? (
            <LessonNavLink
              href={`/lessons/${previous.slug}`}
              direction="previous"
              fromLessonSlug={currentLessonSlug}
              toLessonSlug={previous.slug}
              courseSlug={courseSlug}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-surface px-4 text-body-lg font-medium text-neutral-900 hover:shadow-md"
            >
              <ChevronLeftIcon className="size-5" />
              <span className="hidden sm:inline">Previous Lesson</span>
              <span className="sm:hidden">Previous</span>
            </LessonNavLink>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-11 shrink-0 cursor-not-allowed items-center gap-2 rounded-md border border-neutral-200 bg-surface px-4 text-body-lg font-medium text-neutral-300"
            >
              <ChevronLeftIcon className="size-5" />
              <span className="hidden sm:inline">Previous Lesson</span>
              <span className="sm:hidden">Previous</span>
            </span>
          )}

          {previous ? (
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-body text-neutral-900">
                {previous.title}
              </p>
              <p className="text-small text-neutral-500">
                {formatDuration(previous.duration ?? 0)}
              </p>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-4">
          {next ? (
            <div className="hidden min-w-0 text-right md:block">
              <p className="truncate text-body text-neutral-900">{next.title}</p>
              <p className="text-small text-neutral-500">
                {formatDuration(next.duration ?? 0)}
              </p>
            </div>
          ) : null}

          {next?.slug ? (
            <LessonNavLink
              href={`/lessons/${next.slug}`}
              direction="next"
              fromLessonSlug={currentLessonSlug}
              toLessonSlug={next.slug}
              courseSlug={courseSlug}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
            >
              <span className="hidden sm:inline">Next Lesson</span>
              <span className="sm:hidden">Next</span>
              <ArrowRightIcon className="size-5" />
            </LessonNavLink>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex h-11 shrink-0 cursor-not-allowed items-center gap-2 rounded-md bg-primary-100 px-4 text-body-lg font-medium text-primary-300"
            >
              <span className="hidden sm:inline">Next Lesson</span>
              <span className="sm:hidden">Next</span>
              <ArrowRightIcon className="size-5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
