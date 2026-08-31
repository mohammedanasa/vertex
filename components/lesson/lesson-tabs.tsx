"use client";

import { useState, type ReactNode } from "react";
import posthog from "posthog-js";
import { cn } from "@/lib/utils";

type TabId = "content" | "notes";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "content", label: "Lesson Content" },
  { id: "notes", label: "Notes" },
];

/**
 * The Notes tab is presentational only (AGENTS.md §7) — it has no backend, so
 * nothing typed here is persisted. Only the active tab is local state.
 */
export function LessonTabs({
  lessonSlug,
  content,
  notes,
}: {
  lessonSlug: string;
  content: ReactNode;
  notes: ReactNode;
}) {
  const [active, setActive] = useState<TabId>("content");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Lesson sections"
        className="flex gap-8 border-b border-neutral-200"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`lesson-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`lesson-panel-${tab.id}`}
              onClick={() => {
                setActive(tab.id);
                if (!isActive) {
                  posthog.capture("lesson_tab_changed", {
                    lesson_slug: lessonSlug,
                    tab: tab.id,
                  });
                }
              }}
              className={cn(
                "-mb-px border-b-2 px-1 pb-3 text-body-lg font-medium transition-colors",
                isActive
                  ? "border-primary-500 text-primary-500"
                  : "border-transparent text-neutral-500 hover:text-neutral-900",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id="lesson-panel-content"
        aria-labelledby="lesson-tab-content"
        hidden={active !== "content"}
        className="pt-8"
      >
        {content}
      </div>

      <div
        role="tabpanel"
        id="lesson-panel-notes"
        aria-labelledby="lesson-tab-notes"
        hidden={active !== "notes"}
        className="pt-8"
      >
        {notes}
      </div>
    </div>
  );
}
