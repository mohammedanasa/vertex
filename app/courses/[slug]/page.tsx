import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BarChartIcon, ClockIcon, FolderIcon, UsersIcon } from "@/components/icons";
import { CourseCTAButtons } from "@/components/course/course-cta-buttons";
import { CourseProgressBar } from "@/components/course/course-progress-bar";
import { CourseViewTracker } from "@/components/course/course-view-tracker";
import { ModuleList } from "@/components/course/module-list";
import { OutcomeGrid } from "@/components/course/outcome-grid";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { BookmarkButton } from "@/components/ui/bookmark-button";
import { Container } from "@/components/ui/container";
import { formatCount, formatDuration } from "@/lib/format";
import { getCourseBySlug, getCourseSlugs } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

export async function generateStaticParams() {
  const slugs = await getCourseSlugs();
  return slugs.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/courses/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) return {};

  return {
    title: `${course.title} — Vertex`,
    description: course.summary ?? undefined,
  };
}

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default async function CoursePage({
  params,
}: PageProps<"/courses/[slug]">) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);

  if (!course) {
    notFound();
  }

  const modules = course.modules ?? [];
  const moduleDurations = modules.map((mod) =>
    (mod.lessons ?? []).reduce((sum, lesson) => sum + (lesson?.duration ?? 0), 0),
  );
  const totalDuration = moduleDurations.reduce((sum, d) => sum + d, 0);
  const firstLessonSlug = modules.find((mod) => (mod.lessons?.length ?? 0) > 0)
    ?.lessons?.[0]?.slug;

  const moduleListItems = modules.map((mod, index) => ({
    _key: mod._key,
    title: mod.title,
    summary: mod.summary,
    durationSeconds: moduleDurations[index],
    lessons: (mod.lessons ?? []).flatMap((lesson) =>
      lesson
        ? [
            {
              _id: lesson._id,
              title: lesson.title,
              slug: lesson.slug,
              duration: lesson.duration,
              freePreview: lesson.freePreview,
            },
          ]
        : [],
    ),
  }));

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Container className="py-8">
          <Breadcrumbs
            items={[
              { label: "All Courses", href: "/courses" },
              { label: course.title ?? "" },
            ]}
          />

          <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-900 lg:aspect-auto">
              {course.coverImage ? (
                <Image
                  src={urlFor(course.coverImage).width(900).height(900).url()}
                  alt={course.title ?? ""}
                  fill
                  className="object-cover"
                  priority
                />
              ) : null}
            </div>

            <div className="flex flex-col justify-center">
              {course.popular ? (
                <Badge tone="popular" className="self-start">
                  Popular
                </Badge>
              ) : null}

              <div className="mt-4 flex items-start justify-between gap-4">
                <h1 className="min-w-0 font-display text-display-2 font-bold text-neutral-900">
                  {course.title}
                </h1>
                <BookmarkButton kind="course" slug={slug} />
              </div>

              <p className="mt-4 text-body-lg text-neutral-500">{course.summary}</p>

              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-body text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <BarChartIcon className="size-4" />
                  {course.level ? LEVEL_LABELS[course.level] : null}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-4" />
                  {formatDuration(totalDuration)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FolderIcon className="size-4" />
                  {modules.length} modules
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UsersIcon className="size-4" />
                  {formatCount(course.studentCount ?? 0)} students
                </span>
              </div>

              <CourseCTAButtons
                continueHref={firstLessonSlug ? `/lessons/${firstLessonSlug}` : "#"}
                courseSlug={slug}
                courseTitle={course.title ?? null}
                continueLessonSlug={firstLessonSlug ?? null}
              />
            </div>
          </div>

          <div className="mt-12">
            <OutcomeGrid outcomes={course.learningOutcomes ?? []} />
          </div>

          <div className="mt-12">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-heading-1 font-bold text-neutral-900">
                Course Content
              </h2>
              <p className="text-body text-neutral-500">
                {modules.length} modules <span className="px-1">·</span>{" "}
                {formatDuration(totalDuration)}
              </p>
            </div>

            <div className="mt-6 rounded-lg border border-neutral-200 bg-surface p-6 sm:p-8">
              <ModuleList modules={moduleListItems} />
            </div>
          </div>
        </Container>
      </main>

      <CourseProgressBar
        continueHref={firstLessonSlug ? `/lessons/${firstLessonSlug}` : "#"}
        courseSlug={slug}
        continueLessonSlug={firstLessonSlug ?? null}
      />
      <CourseViewTracker
        courseSlug={slug}
        courseTitle={course.title ?? null}
        courseLevel={course.level ?? null}
      />
    </div>
  );
}
