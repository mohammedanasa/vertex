import Image from "next/image";
import Link from "next/link";

import {
  ArrowRightIcon,
  BarChartIcon,
  ClockIcon,
  FolderIcon,
} from "@/components/icons";
import { CourseResumeLink } from "@/components/course/course-resume-link";
import { CourseActionsMenu } from "@/components/my-learning/course-actions-menu";
import { BookmarkButton } from "@/components/ui/bookmark-button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusIndicator } from "@/components/ui/status";
import { formatDuration } from "@/lib/format";
import type { CourseProgress } from "@/lib/progress";
import { urlFor } from "@/sanity/lib/image";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export interface EnrolledCourseCardProps {
  /** Sanity document id — what the progress actions write against. */
  courseId: string;
  slug: string;
  title: string | null;
  summary: string | null;
  /** Sanity image source for the cover; falls back to the catalog's dark block. */
  coverImage: Parameters<typeof urlFor>[0] | null;
  level: string | null;
  moduleCount: number;
  totalDuration: number;
  progress: CourseProgress;
  /** Where Continue/Review goes — the course's first lesson. */
  resumeSlug: string | null;
  /** Whether this course is in the learner's Saved list. */
  isBookmarked?: boolean;
  /** My Learning is signed-in only, but the button needs it stated. */
  isSignedIn?: boolean;
}

/**
 * One started course on My Learning: identity, completion state, and a way back in.
 *
 * A server component. Only the resume link is client-side, because it reports
 * the resume to PostHog.
 */
export function EnrolledCourseCard({
  courseId,
  slug,
  title,
  summary,
  coverImage,
  level,
  moduleCount,
  totalDuration,
  progress,
  resumeSlug,
  isBookmarked,
  isSignedIn,
}: EnrolledCourseCardProps) {
  const { completedLessons, totalLessons, percentComplete, isComplete } = progress;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-neutral-900">
          {coverImage ? (
            <Image
              src={urlFor(coverImage).width(96).height(96).url()}
              alt=""
              fill
              className="object-cover"
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/courses/${slug}`} className="hover:text-primary-500">
            <h3 className="font-display text-heading-3 font-bold text-neutral-900">
              {title}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-2 text-body text-neutral-500">{summary}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BookmarkButton
            kind="course"
            id={courseId}
            slug={slug}
            initialBookmarked={isBookmarked}
            isSignedIn={isSignedIn}
            className="size-9"
          />
          <CourseActionsMenu
            courseId={courseId}
            courseSlug={slug}
            courseTitle={title}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <StatusIndicator status={isComplete ? "completed" : "in-progress"} />
          <p className="text-body text-neutral-500">
            {completedLessons} of {totalLessons} lessons
          </p>
        </div>
        <ProgressBar value={percentComplete} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-200 pt-4">
        <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
          <BarChartIcon className="size-3.5" />
          {level ? LEVEL_LABELS[level] : null}
        </span>
        <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
          <ClockIcon className="size-3.5" />
          {formatDuration(totalDuration)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
          <FolderIcon className="size-3.5" />
          {moduleCount} modules
        </span>
      </div>

      {/*
        Resume *intent*, not a stored position: there is no progress backend yet
        (AGENTS.md §7), so this goes to the course's first lesson. The label
        differs for a finished course; the destination does not.
      */}
      <CourseResumeLink
        href={resumeSlug ? `/lessons/${resumeSlug}` : `/courses/${slug}`}
        source="my_learning_card"
        courseSlug={slug}
        lessonSlug={resumeSlug}
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
      >
        {isComplete ? "Review Course" : "Continue Learning"}
        <ArrowRightIcon className="size-5" />
      </CourseResumeLink>
    </Card>
  );
}
