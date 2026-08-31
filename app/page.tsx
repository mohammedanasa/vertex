import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BarChartIcon,
  ClockIcon,
  FolderIcon,
  StarIcon,
} from "@/components/icons";
import { DecorativeBars } from "@/components/home/decorative-bars";
import { HeroSearch } from "@/components/home/hero-search";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { getCourses } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export default async function Home() {
  const allCourses = await getCourses();
  const courses = allCourses.slice(0, 3);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-28">
          <span className="rounded-xs border border-primary-200 bg-primary-100 px-3 py-1.5 text-small font-semibold tracking-wider text-primary-500 uppercase">
            Intelligent Learning
          </span>

          <h1 className="mt-6 font-display text-display-2 font-bold text-neutral-900 sm:text-display-1">
            Search your learning in plain English.
          </h1>

          <p className="mt-6 max-w-xl text-body-lg text-neutral-500">
            Vertex understands what you want to learn and finds the exact
            lessons across all your courses.
          </p>

          <Button className="mt-8">
            Explore Courses
            <ArrowRightIcon className="size-5" />
          </Button>

          <div className="mt-10 w-full max-w-2xl">
            <HeroSearch />
          </div>
        </section>

        <div className="border-t border-neutral-200" />

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="font-display text-display-2 font-bold text-neutral-900">
              All Courses
            </h2>
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 text-body font-medium text-primary-500 hover:text-primary-600"
            >
              View all courses
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <Card key={course._id}>
                <div className="flex items-start gap-4">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-neutral-900">
                    {course.coverImage ? (
                      <Image
                        src={urlFor(course.coverImage).width(96).height(96).url()}
                        alt={course.title ?? ""}
                        fill
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/courses/${course.slug}`}
                      className="hover:text-primary-500"
                    >
                      <h3 className="font-display text-heading-3 font-bold text-neutral-900">
                        {course.title}
                      </h3>
                    </Link>
                    <p className="mt-1 text-body text-neutral-500">
                      {course.summary}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-200 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
                    <BarChartIcon className="size-3.5" />
                    {course.level ? LEVEL_LABELS[course.level] : null}
                  </span>
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

        <section className="px-6 pb-4">
          <div className="mx-auto flex max-w-3xl items-center gap-4 text-neutral-300">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="flex items-center gap-2 text-body text-neutral-500">
              <StarIcon className="size-4 text-primary-500" />
              New courses and lessons added every week.
            </span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>
        </section>

        <DecorativeBars />
      </main>
    </div>
  );
}
