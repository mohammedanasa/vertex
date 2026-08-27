"use client";

import type { SelectHTMLAttributes } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Design system 08 — native select with the chevron drawn on top. */
export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        className="peer h-11 w-full appearance-none rounded-md border border-neutral-200 bg-surface pr-11 pl-4 text-body-lg text-neutral-900 focus:border-primary-400 focus:outline-none"
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-neutral-900" />
    </div>
  );
}
