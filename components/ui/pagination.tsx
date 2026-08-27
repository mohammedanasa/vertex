import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

const cell =
  "inline-flex size-9 items-center justify-center rounded-sm text-body-lg text-neutral-500 hover:text-primary-500";

/** Collapse a long page list to `1 … n-1 n` style with the current page shown. */
function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const middle = [current - 1, current, current + 1].filter(
    (page) => page > 1 && page < total,
  );

  return [
    1,
    ...(middle[0] !== undefined && middle[0] > 2
      ? (["ellipsis"] as const)
      : []),
    ...middle,
    ...(middle[middle.length - 1] !== undefined &&
    middle[middle.length - 1] < total - 1
      ? (["ellipsis"] as const)
      : []),
    total,
  ];
}

/** Design system 13 — prev/next chevrons with the active page outlined. */
export function Pagination({
  page,
  totalPages,
  hrefFor = (target: number) => `?page=${target}`,
  className,
}: {
  page: number;
  totalPages: number;
  hrefFor?: (page: number) => string;
  className?: string;
}) {
  const items = pageItems(page, totalPages);

  return (
    <nav aria-label="Pagination" className={className}>
      <ul className="flex items-center gap-1">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              aria-label="Previous page"
              className={cell}
            >
              <ChevronLeftIcon className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={cn(cell, "text-neutral-300 hover:text-neutral-300")}
            >
              <ChevronLeftIcon className="size-4" />
            </span>
          )}
        </li>

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <li key={`ellipsis-${index}`} aria-hidden="true">
              <span className={cn(cell, "hover:text-neutral-500")}>…</span>
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={cn(
                  cell,
                  item === page &&
                    "border border-primary-500 text-primary-500 hover:text-primary-500",
                )}
              >
                {item}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              aria-label="Next page"
              className={cell}
            >
              <ChevronRightIcon className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={cn(cell, "text-neutral-300 hover:text-neutral-300")}
            >
              <ChevronRightIcon className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
