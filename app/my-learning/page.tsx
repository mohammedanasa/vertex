import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

import { ArrowRightIcon, TargetIcon } from "@/components/icons";
import { EnrolledCourseCard } from "@/components/my-learning/enrolled-course-card";
import { MyLearningFilters } from "@/components/my-learning/my-learning-filters";
import { MyLearningViewTracker } from "@/components/my-learning/my-learning-view-tracker";
import { SiteHeader } from "@/components/site-header";
import { Container } from "@/components/ui/container";
import { getCourseProgress } from "@/lib/progress";
import { getCourses } from "@/sanity/lib/data";

export const metadata: Metadata = {
  title: "My Learning — Vertex",
  description: "The courses you've started and how far along you are.",
};

/** Allowed `?status=` values. Anything else falls back to "all". */
const STATUSES = ["all", "in-progress", "completed"] as const;
type Status = (typeof STATUSES)[number];

function parseStatus(value: string | string[] | undefined): Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value)
    ? (value as Status)
    : "all";
}

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
        My Learning
      </h1>
      {children}
    </div>
  );
}

/** Shared empty-state block: icon, message, and a way onward. */
function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-lg border border-neutral-200 bg-surface px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary-100">
        <TargetIcon className="size-6 text-primary-500" />
      </span>
      <p className="mt-4 font-display text-heading-2 font-bold text-neutral-900">
        {title}
      </p>
      <p className="mt-2 max-w-md text-body-lg text-neutral-500">{description}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
        >
          {actionLabel}
          <ArrowRightIcon className="size-5" />
        </Link>
      ) : null}
      {children}
    </div>
  );
}

/**
 * My Learning — the courses a learner has started, with completion status.
 *
 * Presentational by design (AGENTS.md §7). It reads catalog content server-side
 * and reads progress through `lib/progress.ts`, which is still a placeholder;
 * it writes nothing, and no token or progress logic reaches the browser (§5).
 *
 * "Subscribed" means started: a course appears once the learner has progress on
 * it. There is no separate enrollment concept in the content model (§8).
 */
export default async function MyLearningPage({
  searchParams,
}: PageProps<"/my-learning">) {
  const { userId } = await auth();
  const { status: statusParam } = await searchParams;
  const status = parseStatus(statusParam);

  // Browsing stays public (AGENTS.md §7), so a signed-out learner gets an
  // in-page prompt rather than a redirect — `proxy.ts` gates nothing.
  if (!userId) {
    return (
      <Shell>
        <Heading />
        <EmptyState
          title="Sign in to see your learning"
          description="Your courses and progress are tied to your account. Sign in to pick up where you left off."
        >
          <SignInButton mode="modal">
            <button
              type="button"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600"
            >
              Sign In
            </button>
          </SignInButton>
        </EmptyState>
      </Shell>
    );
  }

  const courses = await getCourses();

  // A course joins My Learning once it has been started. Progress is resolved
  // once per course here, then handed to the card as data.
  const started = courses.flatMap((course) => {
    const progress = getCourseProgress(
      userId,
      course._id,
      course.lessonCount ?? 0,
    );
    if (!progress.hasStarted) return [];

    const resumeSlug =
      (course.lessonSlugs ?? []).find((slug): slug is string => Boolean(slug)) ??
      null;

    return [{ course, progress, resumeSlug }];
  });

  const visible = started.filter(({ progress }) =>
    status === "completed"
      ? progress.isComplete
      : status === "in-progress"
        ? !progress.isComplete
        : true,
  );

  const completedCount = started.filter((c) => c.progress.isComplete).length;
  const inProgressCount = started.length - completedCount;

  return (
    <Shell>
      <Heading>
        {started.length > 0 ? (
          <p className="text-body-lg text-neutral-500">
            {inProgressCount} in progress
            <span className="px-2">·</span>
            {completedCount} completed
          </p>
        ) : null}
      </Heading>

      {started.length === 0 ? (
        <EmptyState
          title="You haven't started a course yet"
          description="Once you begin a course it shows up here, along with how far you've gotten."
          actionHref="/courses"
          actionLabel="Browse all courses"
        />
      ) : (
        <>
          <div className="mt-8">
            <MyLearningFilters status={status} />
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title={
                status === "completed"
                  ? "No completed courses yet"
                  : "Nothing in progress"
              }
              description={
                status === "completed"
                  ? "Finish a course and it will appear here."
                  : "You've completed everything you've started. Nice work."
              }
              actionHref="/my-learning"
              actionLabel="Show all courses"
            />
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map(({ course, progress, resumeSlug }) => (
                <EnrolledCourseCard
                  key={course._id}
                  slug={course.slug ?? ""}
                  title={course.title}
                  summary={course.summary}
                  coverImage={course.coverImage ?? null}
                  level={course.level}
                  moduleCount={course.moduleCount ?? 0}
                  totalDuration={course.totalDuration ?? 0}
                  progress={progress}
                  resumeSlug={resumeSlug}
                />
              ))}
            </div>
          )}
        </>
      )}

      <MyLearningViewTracker
        courseCount={started.length}
        visibleCount={visible.length}
        status={status}
      />
    </Shell>
  );
}
