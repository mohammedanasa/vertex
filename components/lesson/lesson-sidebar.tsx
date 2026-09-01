"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  PlayCircleFilledIcon,
} from "@/components/icons";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface SidebarLesson {
  _id: string;
  title: string | null;
  slug: string | null;
  duration: number | null;
  isCurrent: boolean;
}

export interface SidebarModule {
  _key: string;
  title: string | null;
  number: number;
  durationSeconds: number;
  lessons: SidebarLesson[];
}

interface LessonSidebarProps {
  courseTitle: string | null;
  courseSlug: string | null;
  courseImageUrl: string | null;
  modules: SidebarModule[];
  currentModuleNumber: number | null;
  /** Real stored progress for this course, resolved server-side. */
  percentComplete: number;
  /** Lesson ids this learner has finished, for the per-lesson check marks. */
  completedLessonIds: string[];
}

export function LessonSidebar({
  courseTitle,
  courseSlug,
  courseImageUrl,
  modules,
  currentModuleNumber,
  percentComplete,
  completedLessonIds,
}: LessonSidebarProps) {
  const [openModule, setOpenModule] = useState<number | null>(
    currentModuleNumber,
  );
  const completed = new Set(completedLessonIds);

  return (
    <div className="flex flex-col">
      <div className="border-b border-neutral-200 px-6 py-6">
        <Link
          href={courseSlug ? `/courses/${courseSlug}` : "/courses"}
          className="inline-flex items-center gap-2 text-body font-medium text-primary-500 hover:text-primary-600"
        >
          <ChevronLeftIcon className="size-4" />
          Back to course
        </Link>

        <div className="mt-5 flex items-start gap-3">
          <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-900 text-heading-2 font-semibold text-white">
            {courseImageUrl ? (
              <Image
                src={courseImageUrl}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              (courseTitle ?? "?").charAt(0)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body font-semibold text-neutral-900">
              {courseTitle}
            </p>
            <ProgressBar
              value={percentComplete}
              showLabel={false}
              className="mt-2"
            />
            <p className="mt-1.5 text-small text-neutral-500">
              {percentComplete}% complete
            </p>
          </div>
        </div>
      </div>

      {currentModuleNumber ? (
        <p className="border-b border-neutral-200 px-6 py-4 text-body text-neutral-900">
          Module {currentModuleNumber} of {modules.length}
        </p>
      ) : null}

      <ol className="flex flex-col">
        {modules.map((mod) => {
          const isOpen = openModule === mod.number;
          const isCurrent = mod.number === currentModuleNumber;
          // A module is complete when every lesson in it is — real stored
          // completion, not the module's position in the course.
          const isComplete =
            mod.lessons.length > 0 &&
            mod.lessons.every((lesson) => completed.has(lesson._id));

          return (
            <li
              key={mod._key}
              className={cn(
                "border-b border-neutral-200",
                isCurrent && "bg-neutral-50",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  setOpenModule((open) => (open === mod.number ? null : mod.number))
                }
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-6 py-4 text-left hover:bg-neutral-50"
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-body font-semibold",
                    isCurrent
                      ? "bg-primary-500 text-white"
                      : "border border-neutral-200 text-neutral-900",
                  )}
                >
                  {mod.number}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-neutral-900">
                    {mod.title}
                  </span>
                  <span className="mt-0.5 block text-small text-neutral-500">
                    {formatDuration(mod.durationSeconds)}
                  </span>
                </span>

                {isComplete ? (
                  <CheckCircleIcon className="size-5 shrink-0 text-primary-500" />
                ) : (
                  <ChevronDownIcon
                    className={cn(
                      "size-5 shrink-0 text-neutral-500 transition-transform",
                      isOpen && "rotate-180",
                    )}
                  />
                )}
              </button>

              {isOpen && mod.lessons.length > 0 ? (
                <ul className="flex flex-col pb-2">
                  {mod.lessons.map((lesson) => (
                    <li key={lesson._id}>
                      <Link
                        href={lesson.slug ? `/lessons/${lesson.slug}` : "#"}
                        aria-current={lesson.isCurrent ? "page" : undefined}
                        className="flex items-start gap-3 py-2 pr-6 pl-[3.25rem] hover:bg-neutral-100"
                      >
                        {completed.has(lesson._id) ? (
                          <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-success-500" />
                        ) : (
                          <span
                            className={cn(
                              "mt-1.5 size-2 shrink-0 rounded-full",
                              lesson.isCurrent
                                ? "bg-primary-500"
                                : "border border-neutral-300",
                            )}
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block text-body",
                              lesson.isCurrent
                                ? "font-medium text-neutral-900"
                                : "text-neutral-700",
                            )}
                          >
                            {lesson.title}
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block text-small",
                              lesson.isCurrent
                                ? "text-primary-500"
                                : "text-neutral-500",
                            )}
                          >
                            {lesson.isCurrent
                              ? "Now playing"
                              : formatDuration(lesson.duration ?? 0)}
                          </span>
                        </span>
                        {lesson.isCurrent ? (
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white">
                            <PlayCircleFilledIcon className="size-4" />
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
