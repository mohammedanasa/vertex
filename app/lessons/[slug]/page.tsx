import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  BarChartIcon,
  CheckCircleIcon,
  ClockIcon,
  LightbulbIcon,
  UsersIcon,
} from "@/components/icons";
import { LessonBookmarkButton } from "@/components/lesson/lesson-bookmark-button";
import { LessonNav } from "@/components/lesson/lesson-nav";
import { LessonNotes } from "@/components/lesson/lesson-notes";
import { LessonResources } from "@/components/lesson/lesson-resources";
import { LessonSidebar } from "@/components/lesson/lesson-sidebar";
import { LessonTabs } from "@/components/lesson/lesson-tabs";
import { LessonVideo } from "@/components/lesson/lesson-video";
import { LessonViewTracker } from "@/components/lesson/lesson-view-tracker";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import {
  formatCount,
  formatDuration,
  portableTextToPlainText,
} from "@/lib/format";
import { courseProgress, getProgressForUser } from "@/lib/progress";
import { parseStartSeconds, parseYouTubeId } from "@/lib/video";
import { getLessonBySlug, getLessonSlugs } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export async function generateStaticParams() {
  const slugs = await getLessonSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/lessons/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = await getLessonBySlug(slug);
  if (!lesson) return {};

  const title = lesson.course?.title
    ? `${lesson.title} — ${lesson.course.title} — Vertex`
    : `${lesson.title} — Vertex`;

  return {
    title,
    description: portableTextToPlainText(lesson.notes, { maxBlocks: 1 }) || undefined,
  };
}

export default async function LessonPage({
  params,
  searchParams,
}: PageProps<"/lessons/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const lesson = await getLessonBySlug(slug);

  if (!lesson) {
    notFound();
  }

  const course = lesson.course;

  // Real progress for this learner, used by the sidebar's percentage and its
  // per-lesson check marks. Signed out reads as 0% with nothing completed.
  const { userId } = await auth();
  const learner = userId ? await getProgressForUser(userId) : null;
  const courseLessonIds = (course?.modules ?? []).flatMap((mod) =>
    mod.lessons.map((l) => l._id),
  );
  const progress =
    learner && course
      ? courseProgress(learner, course._id, courseLessonIds)
      : { percentComplete: 0 };
  const completedLessonIds = learner
    ? courseLessonIds.filter((id) => learner.completedLessons.has(id))
    : [];
  // Search results link to a moment with `t`; `startSeconds` is the alias.
  const startSeconds = parseStartSeconds(query.t ?? query.startSeconds);

  // Auto-advance sends the learner here mid-flow, so the next video starts on
  // its own. Kept separate from `startSeconds`: that one means "seek to this
  // moment", while this means "begin at the top, already playing".
  const autoplay = query.autoplay === "1";

  // The authored URL is parsed to an id and never used as an iframe src.
  const videoId = parseYouTubeId(lesson.videoUrl);
  const posterUrl = lesson.thumbnail
    ? urlFor(lesson.thumbnail).width(1280).height(720).url()
    : null;
  const courseImageUrl = course?.coverImage
    ? urlFor(course.coverImage).width(112).height(112).url()
    : null;

  // The schema has no lesson summary; the opening notes paragraph is the
  // authored intro shown under the title.
  const intro = portableTextToPlainText(lesson.notes, { maxBlocks: 1 });
  const keyPoints = lesson.keyPoints ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <Container className="flex flex-1 flex-col px-0 lg:flex-row">
        {course ? (
          <aside className="border-b border-neutral-200 bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0">
            <LessonSidebar
              courseTitle={course.title}
              courseSlug={course.slug}
              courseImageUrl={courseImageUrl}
              modules={course.modules}
              currentModuleNumber={course.moduleNumber}
              percentComplete={progress.percentComplete}
              completedLessonIds={completedLessonIds}
            />
          </aside>
        ) : null}

        <main className="min-w-0 flex-1">
          <div className="px-6 py-8 lg:px-8">
            <Breadcrumbs
              items={[
                { label: "All Courses", href: "/courses" },
                ...(course
                  ? [
                      {
                        label: course.title ?? "",
                        href: course.slug ? `/courses/${course.slug}` : undefined,
                      },
                      ...(course.moduleTitle
                        ? [{ label: course.moduleTitle }]
                        : []),
                    ]
                  : []),
                { label: lesson.title ?? "" },
              ]}
            />

            <div className="mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {course?.lessonLabel ? (
                  <Badge tone="video">Lesson {course.lessonLabel}</Badge>
                ) : null}

                <h1 className="mt-4 font-display text-display-2 font-bold text-neutral-900">
                  {lesson.title}
                </h1>

                {intro ? (
                  <p className="mt-4 max-w-2xl text-body-lg text-neutral-500">
                    {intro}
                  </p>
                ) : null}
              </div>

              <LessonBookmarkButton lessonSlug={slug} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-body text-neutral-500">
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-4" />
                {formatDuration(lesson.duration ?? 0)}
              </span>
              {course?.level ? (
                <span className="inline-flex items-center gap-1.5">
                  <BarChartIcon className="size-4" />
                  {LEVEL_LABELS[course.level] ?? course.level}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="size-4" />
                {formatCount(lesson.studentCount ?? 0)} students
              </span>
            </div>

            <div className="mt-8">
              <LessonVideo
                videoId={videoId}
                posterUrl={posterUrl}
                title={lesson.title ?? "Lesson video"}
                startSeconds={startSeconds}
                autoplay={autoplay}
                lessonSlug={slug}
                courseSlug={course?.slug ?? null}
                lessonLabel={course?.lessonLabel ?? null}
                durationSeconds={lesson.duration ?? null}
                lessonId={userId ? lesson._id : null}
                courseId={userId ? (course?._id ?? null) : null}
                nextLesson={
                  course?.nextLesson?.slug
                    ? {
                        slug: course.nextLesson.slug,
                        title: course.nextLesson.title,
                        duration: course.nextLesson.duration,
                      }
                    : null
                }
              />
            </div>

            <div className="mt-8 max-w-3xl">
              <LessonTabs
                lessonSlug={slug}
                content={
                  <div className="flex flex-col gap-10">
                    <section>
                      <h2 className="text-heading-2 font-semibold text-neutral-900">
                        Overview
                      </h2>
                      <div className="mt-4">
                        <LessonNotes value={lesson.notes} />
                      </div>
                    </section>

                    {keyPoints.length > 0 ? (
                      <section className="border-t border-neutral-200 pt-8">
                        <h3 className="text-heading-3 font-semibold text-neutral-900">
                          In this lesson you will:
                        </h3>
                        <ul className="mt-4 flex flex-col gap-3">
                          {keyPoints.map((point) => (
                            <li key={point} className="flex items-start gap-3">
                              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-primary-500" />
                              <span className="text-body-lg text-neutral-700">
                                {point}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {lesson.proTip ? (
                      <div className="flex items-start gap-3 rounded-lg bg-primary-100 p-5">
                        <LightbulbIcon className="mt-0.5 size-5 shrink-0 text-primary-500" />
                        <div>
                          <p className="text-body-lg font-semibold text-neutral-900">
                            Pro Tip
                          </p>
                          <p className="mt-1 text-body-lg text-neutral-700">
                            {lesson.proTip}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    <div className="border-t border-neutral-200 pt-8">
                      <LessonResources
                        resources={lesson.resources ?? []}
                        lessonSlug={slug}
                      />
                    </div>
                  </div>
                }
                notes={
                  <div className="rounded-lg border border-dashed border-neutral-200 bg-surface p-8 text-center">
                    <p className="text-body-lg font-medium text-neutral-900">
                      Your notes
                    </p>
                    <p className="mt-2 text-body text-neutral-500">
                      Personal notes are coming soon. Nothing you write here is
                      saved yet.
                    </p>
                  </div>
                }
              />
            </div>
          </div>

          <LessonNav
            previous={course?.previousLesson ?? null}
            next={course?.nextLesson ?? null}
            currentLessonSlug={slug}
            courseSlug={course?.slug ?? null}
          />
        </main>
      </Container>

      <LessonViewTracker
        lessonSlug={slug}
        courseSlug={course?.slug ?? null}
        courseId={userId ? (course?._id ?? null) : null}
        lessonLabel={course?.lessonLabel ?? null}
        durationSeconds={lesson.duration ?? null}
      />
    </div>
  );
}
