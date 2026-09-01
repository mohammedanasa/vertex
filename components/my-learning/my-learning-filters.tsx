"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import { Select } from "@/components/ui/select";

/**
 * Status filter for My Learning.
 *
 * Navigates to a new `/my-learning` URL on change and lets the server do the
 * filtering — the same pattern as `components/course/course-filters.tsx`, so
 * the selection survives a reload and is shareable.
 */
export function MyLearningFilters({ status }: { status: string }) {
  const router = useRouter();

  function updateStatus(value: string) {
    posthog.capture("my_learning_filter_applied", { filter_value: value });
    router.push(value === "all" ? "/my-learning" : `/my-learning?status=${value}`);
  }

  return (
    <div className="flex flex-wrap gap-4">
      <Select
        className="max-w-56"
        aria-label="Filter by status"
        value={status}
        onChange={(e) => updateStatus(e.target.value)}
      >
        <option value="all">All Courses</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </Select>
    </div>
  );
}
