import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import {
  ArrowRightIcon,
  BarChartIcon,
  BookmarkIcon,
  ClockIcon,
  FolderIcon,
  PlayCircleIcon,
} from "@/components/icons";
import { SiteHeader } from "@/components/site-header";
import { BookmarkButton } from "@/components/ui/bookmark-button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { formatDuration } from "@/lib/format";
import { getProgressForUser } from "@/lib/progress";
import { getBookmarkedItems } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

export const metadata: Metadata = {
  title: "Saved — Vertex",
  description: "The courses and lessons you've saved for later.",
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

/** Page shell, so every state below shares the same chrome and widths. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Container className="py-12">{children}</Container>
      </main>
    </div>
  );
}

function Heading({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-display text-display-2 font-bold text-neutral-900">
        Saved
      </h1>
      {children}
    </div>
  );
}

function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-12 flex flex-col items-center rounded-md border border-dashed border-neutral-200 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary-500">
        <BookmarkIcon className="size-6" />
      </span>
      <h2 className="mt-4 font-display text-heading-2 font-bold text-neutral-900">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-body text-neutral-500">{description}</p>
      {children}
    </div>
  );
}

const PRIMARY_LINK =
  "mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600";

/**
 * The learner's saved courses and lessons — where bookmarks are managed.
 *
 * A sibling of My Learning rather than a tab on it: My Learning is scoped to
 * courses the learner has *started* and filters by completion, and a saved
 * course that was never opened belongs to none of those states.
 *
 * Read-only, like every other page (AGENTS.md §5). Removing an item goes
 * through `BookmarkButton`, which POSTs to `/api/progress`.
 */
export default async function SavedPage() {
  const { userId } = await auth();

  // Browsing stays public (§7), so a signed-out learner gets an in-page prompt
  // rather than a redirect — matching My Learning; `proxy.ts` gates nothing.
  if (!userId) {
    return (
      <Shell>
        <Heading />
        <EmptyState
          title="Sign in to see what you saved"
          description="Bookmarks are tied to your account. Sign in to pick them back up."
        >
          <SignInButton mode="modal">
            <button
              type="button"
              className={PRIMARY_LINK}
            >
              Sign In
            </button>
          </SignInButton>
        </EmptyState>
      </Shell>
    );
  }

  const learner = await getProgressForUser(userId);
  const { courses, lessons } = await getBookmarkedItems(
    [...learner.bookmarkedCourses],
    [...learner.bookmarkedLessons],
  );

  const total = courses.length + lessons.length;

  if (total === 0) {
    return (
      <Shell>
        <Heading />
        <EmptyState
          title="Nothing saved yet"
          description="Bookmark a course or a lesson and it will show up here for later."
        >
          <Link href="/courses" className={PRIMARY_LINK}>
            Browse courses
            <ArrowRightIcon className="size-4" />
          </Link>
        </EmptyState>
      </Shell>
    );
  }

  return (
    <Shell>
      <Heading>
        <p className="text-body-lg text-neutral-500">
          {courses.length} course{courses.length === 1 ? "" : "s"} ·{" "}
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
        </p>
      </Heading>

      {courses.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-heading-2 font-bold text-neutral-900">
            Courses
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course._id}>
                <div className="flex items-start gap-4">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-neutral-900">
                    {course.coverImage ? (
                      <Image
                        src={urlFor(course.coverImage).width(96).height(96).url()}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="hover:text-primary-500"
                    >
                      <h3 className="font-display text-heading-3 font-bold text-neutral-900">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="mt-1 line-clamp-2 text-body text-neutral-500">
                      {course.summary}
                    </p>
                  </div>
                  <BookmarkButton
                    kind="course"
                    id={course._id}
                    slug={course.slug ?? ""}
                    initialBookmarked
                    isSignedIn
                    className="size-9"
                  />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-200 pt-4">
                  {course.level ? (
                    <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
                      <BarChartIcon className="size-3.5" />
                      {LEVEL_LABELS[course.level]}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
                    <ClockIcon className="size-3.5" />
                    {formatDuration(course.totalDuration ?? 0)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
                    <FolderIcon className="size-3.5" />
                    {course.moduleCount ?? 0} modules
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {lessons.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-display text-heading-2 font-bold text-neutral-900">
            Lessons
          </h2>
          <div className="mt-6 flex flex-col gap-4">
            {lessons.map((lesson) => (
              <Card key={lesson._id}>
                <div className="flex items-start gap-4">
                  <span className="relative size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-900 text-white">
                    {lesson.thumbnail ? (
                      <Image
                        src={urlFor(lesson.thumbnail).width(96).height(96).url()}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <PlayCircleIcon className="absolute inset-0 m-auto size-5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/lessons/${lesson.slug}`}
                      className="hover:text-primary-500"
                    >
                      <h3 className="font-display text-heading-3 font-bold text-neutral-900">
                        {lesson.title}
                      </h3>
                    </Link>
                    {lesson.course ? (
                      <p className="mt-1 text-small text-neutral-500">
                        in{" "}
                        <Link
                          href={`/courses/${lesson.course.slug}`}
                          className="hover:text-primary-500"
                        >
                          {lesson.course.title}
                        </Link>
                      </p>
                    ) : null}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-small text-neutral-500">
                      <ClockIcon className="size-3.5" />
                      {formatDuration(lesson.duration ?? 0)}
                    </p>
                  </div>

                  <BookmarkButton
                    kind="lesson"
                    id={lesson._id}
                    slug={lesson.slug ?? ""}
                    initialBookmarked
                    isSignedIn
                    className="size-9"
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </Shell>
  );
}
