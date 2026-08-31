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
}

/**
 * Progress is presentational only for now (AGENTS.md §7): there is no progress
 * document, no Clerk-keyed server route, and nothing here writes. The percent
 * and the completed check marks are placeholders shown exactly as the course
 * page's sticky bar already shows them.
 */
const PLACEHOLDER_PROGRESS = 35;

export function LessonSidebar({
  courseTitle,
  courseSlug,
  courseImageUrl,
  modules,
  currentModuleNumber,
}: LessonSidebarProps) {
  const [openModule, setOpenModule] = useState<number | null>(
    currentModuleNumber,
  );

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
              value={PLACEHOLDER_PROGRESS}
              showLabel={false}
              className="mt-2"
            />
            <p className="mt-1.5 text-small text-neutral-500">
              {PLACEHOLDER_PROGRESS}% complete
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
          // Placeholder completion: everything before the current module.
          const isComplete =
            currentModuleNumber !== null && mod.number < currentModuleNumber;

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
                        <span
                          className={cn(
                            "mt-1.5 size-2 shrink-0 rounded-full",
                            lesson.isCurrent
                              ? "bg-primary-500"
                              : "border border-neutral-300",
                          )}
                        />
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
