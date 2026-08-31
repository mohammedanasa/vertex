"use client";

import { useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { ChevronDownIcon, LockIcon, PlayCircleIcon } from "@/components/icons";
import { formatDuration } from "@/lib/format";

export interface ModuleListLesson {
  _id: string;
  title: string | null;
  slug: string | null;
  duration: number | null;
  freePreview: boolean | null;
}

export interface ModuleListItem {
  _key: string;
  title: string | null;
  summary: string | null;
  durationSeconds: number;
  lessons: ModuleListLesson[];
}

const VISIBLE_COUNT = 6;

export function ModuleList({ modules }: { modules: ModuleListItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const [openModuleKey, setOpenModuleKey] = useState<string | null>(null);
  const hasMore = modules.length > VISIBLE_COUNT;
  const visibleModules = expanded ? modules : modules.slice(0, VISIBLE_COUNT);

  return (
    <div>
      <ol className="flex flex-col">
        {visibleModules.map((mod, index) => {
          const isLast = index === visibleModules.length - 1;
          const isOpen = openModuleKey === mod._key;
          return (
            <li key={mod._key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-body font-semibold text-neutral-900">
                  {index + 1}
                </span>
                {isLast ? null : (
                  <span className="w-px flex-1 bg-neutral-200" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 border-b border-neutral-200 pb-6 last:border-b-0">
                <button
                  type="button"
                  onClick={() => {
                    const isOpening = openModuleKey !== mod._key;
                    setOpenModuleKey((key) => (key === mod._key ? null : mod._key));
                    if (isOpening) {
                      posthog.capture("module_expanded", {
                        module_title: mod.title,
                        module_index: index + 1,
                        lesson_count: mod.lessons.length,
                      });
                    }
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div>
                    <h3 className="text-heading-3 font-semibold text-neutral-900">
                      {mod.title}
                    </h3>
                    <p className="mt-1 text-body text-neutral-500">{mod.summary}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 pt-1">
                    <span className="text-body text-neutral-500">
                      {formatDuration(mod.durationSeconds)}
                    </span>
                    <ChevronDownIcon
                      className={`size-5 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>

                {isOpen && mod.lessons.length > 0 ? (
                  <ul className="mt-4 flex flex-col gap-1">
                    {mod.lessons.map((lesson) => (
                      <li key={lesson._id}>
                        <Link
                          href={lesson.slug ? `/lessons/${lesson.slug}` : "#"}
                          className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-body text-neutral-700 hover:bg-neutral-100"
                          onClick={() =>
                            posthog.capture("lesson_clicked", {
                              lesson_slug: lesson.slug,
                              lesson_duration_seconds: lesson.duration,
                              free_preview: lesson.freePreview ?? false,
                              module_title: mod.title,
                            })
                          }
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {lesson.freePreview ? (
                              <PlayCircleIcon className="size-4 shrink-0 text-primary-500" />
                            ) : (
                              <LockIcon className="size-4 shrink-0 text-neutral-300" />
                            )}
                            <span className="truncate">{lesson.title}</span>
                          </span>
                          <span className="shrink-0 text-small text-neutral-500">
                            {formatDuration(lesson.duration ?? 0)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => {
              const nextExpanded = !expanded;
              setExpanded(nextExpanded);
              posthog.capture("module_list_show_all_clicked", {
                action: nextExpanded ? "show_all" : "show_fewer",
                total_modules: modules.length,
              });
            }}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-neutral-200 bg-surface px-4 text-body font-medium text-neutral-900 hover:shadow-md"
          >
            {expanded
              ? "Show fewer modules"
              : `Show all ${modules.length} modules`}
            <ChevronDownIcon
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      ) : null}
    </div>
  );
}
