import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The white panel every numbered design system section sits in. */
export function Section({
  number,
  title,
  className,
  children,
}: {
  number: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-lg border border-neutral-200 bg-surface p-6",
        className,
      )}
    >
      <SectionHeading number={number} title={title} />
      {children}
    </section>
  );
}

export function SectionHeading({
  number,
  title,
  className,
}: {
  number: string;
  title: string;
  className?: string;
}) {
  return (
    <h2 className={cn("flex items-center gap-4", className)}>
      <span className="text-small font-semibold text-primary-500">
        {number}
      </span>
      <span className="text-small font-bold tracking-[0.14em] text-neutral-900 uppercase">
        {title}
      </span>
    </h2>
  );
}

/** Small grey caption used above swatch rows, demos and card examples. */
export function Label({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <p className={cn("text-body text-neutral-700", className)}>{children}</p>
  );
}

/** The bulleted spec lists under Icons, Buttons and Inputs. */
export function SpecList({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <p className="text-body font-semibold text-neutral-900">{title}</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-body text-neutral-500 before:content-['•']"
          >
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
