import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { BarChartIcon, ClockIcon, FolderIcon } from "@/components/icons";
import { CourseFilters } from "@/components/course/course-filters";
import { SiteHeader } from "@/components/site-header";
import { BookmarkButton } from "@/components/ui/bookmark-button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Pagination } from "@/components/ui/pagination";
import { formatDuration } from "@/lib/format";
import { getProgressForUser } from "@/lib/progress";
import { getCategories, getCourses } from "@/sanity/lib/data";
import { urlFor } from "@/sanity/lib/image";

const LEVEL_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const PAGE_SIZE = 9;

function buildHref(params: {
  category?: string;
  sort?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  if (params.sort) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return query ? `/courses?${query}` : "/courses";
}

export default async function CoursesPage({
  searchParams,
}: PageProps<"/courses">) {
  const { category, sort, page: pageParam } = await searchParams;

  // One fetch for the whole page, per lib/progress.ts — never one per card.
  const { userId } = await auth();
  const progress = userId ? await getProgressForUser(userId) : null;

  const categorySlug = typeof category === "string" ? category : undefined;
  const sortOrder = sort === "title" ? "title" : "recent";
  const page = Math.max(1, Number(pageParam) || 1);

  const [allCourses, categories] = await Promise.all([
    getCourses(),
    getCategories(),
  ]);

  const filtered = categorySlug
    ? allCourses.filter((course) => course.category?.slug === categorySlug)
    : allCourses;

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === "title") {
      return (a.title ?? "").localeCompare(b.title ?? "");
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageCourses = sorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />

      <main className="flex-1">
        <Container className="py-12">
          <h1 className="font-display text-display-2 font-bold text-neutral-900">
            All Courses
          </h1>

          <div className="mt-8">
            <CourseFilters
              categories={categories}
              category={categorySlug}
              sort={sortOrder}
            />
          </div>

          {pageCourses.length === 0 ? (
            <p className="mt-16 text-center text-body-lg text-neutral-500">
              No courses match this filter.
            </p>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {pageCourses.map((course) => (
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
                    <div className="min-w-0 flex-1">
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
                    <BookmarkButton
                      kind="course"
                      id={course._id}
                      slug={course.slug ?? ""}
                      initialBookmarked={progress?.bookmarkedCourses.has(
                        course._id,
                      )}
                      isSignedIn={Boolean(userId)}
                      className="size-9"
                    />
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
          )}

          {totalPages > 1 ? (
            <Pagination
              className="mt-10 flex justify-center"
              page={currentPage}
              totalPages={totalPages}
              hrefFor={(target) =>
                buildHref({ category: categorySlug, sort: sortOrder, page: target })
              }
            />
          ) : null}
        </Container>
      </main>
    </div>
  );
}
