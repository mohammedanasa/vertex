import Link from "next/link";
import { ArrowRightIcon, StarIcon } from "@/components/icons";
import { DecorativeBars } from "@/components/home/decorative-bars";
import {
  DockerLogo,
  NextLogo,
  TypeScriptLogo,
} from "@/components/home/course-logos";
import { HeroSearch } from "@/components/home/hero-search";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/ui/card";

const courses = [
  {
    title: "Next.js for Production",
    description: "Build scalable, high-performance web applications with Next.js.",
    level: "Intermediate",
    duration: "18h 24m",
    moduleCount: 12,
    logo: <NextLogo />,
    logoClassName: "bg-neutral-900",
  },
  {
    title: "Docker Essentials",
    description:
      "Containerize applications and streamline your development workflow.",
    level: "Beginner",
    duration: "10h 12m",
    moduleCount: 8,
    logo: <DockerLogo />,
    logoClassName: "bg-white border border-neutral-200",
  },
  {
    title: "TypeScript Deep Dive",
    description: "Go beyond the basics and write safer, more expressive code.",
    level: "Intermediate",
    duration: "14h 36m",
    moduleCount: 10,
    logo: <TypeScriptLogo />,
    logoClassName: "bg-[#3178C6]",
  },
];

export default function Home() {
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
              <CourseCard key={course.title} {...course} />
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
