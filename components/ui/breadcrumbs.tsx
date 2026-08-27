import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href?: string;
}

/** Design system 13 — chevron-separated trail, current page in Neutral 900. */
export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={item.label} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-body text-neutral-500 hover:text-primary-500"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "text-body",
                    isLast ? "text-neutral-900" : "text-neutral-500",
                  )}
                >
                  {item.label}
                </span>
              )}
              {isLast ? null : (
                <ChevronRightIcon className="size-4 shrink-0 text-neutral-300" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
