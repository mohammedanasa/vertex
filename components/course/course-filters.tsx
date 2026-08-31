"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

export interface CourseFilterCategory {
  _id: string;
  title: string | null;
  slug: string | null;
}

/** Navigates to a new `/courses` URL on change; filtering/sorting stays server-side. */
export function CourseFilters({
  categories,
  category,
  sort,
}: {
  categories: CourseFilterCategory[];
  category: string | undefined;
  sort: string;
}) {
  const router = useRouter();

  function updateParam(key: "category" | "sort", value: string) {
    const params = new URLSearchParams();
    if (key === "category" ? value : category) {
      params.set("category", key === "category" ? value : (category ?? ""));
    }
    if (key === "sort" ? value !== "recent" : sort !== "recent") {
      params.set("sort", key === "sort" ? value : sort);
    }
    const query = params.toString();
    router.push(query ? `/courses?${query}` : "/courses");
  }

  return (
    <div className="flex flex-wrap gap-4">
      <Select
        className="max-w-56"
        aria-label="Filter by category"
        value={category ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat._id} value={cat.slug ?? ""}>
            {cat.title}
          </option>
        ))}
      </Select>

      <Select
        className="max-w-48"
        aria-label="Sort courses"
        value={sort}
        onChange={(e) => updateParam("sort", e.target.value)}
      >
        <option value="recent">Most Recent</option>
        <option value="title">Title A–Z</option>
      </Select>
    </div>
  );
}
