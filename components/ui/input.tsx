"use client";

import type { InputHTMLAttributes } from "react";
import { SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Design system 08 — height 44px, radius 12px, 1px Neutral 200, focus Primary 400. */
const field =
  "h-11 w-full rounded-md border border-neutral-200 bg-surface px-4 text-body-lg text-neutral-900 placeholder:text-neutral-500 focus:border-primary-400 focus:outline-none";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, className)} {...props} />;
}

export function SearchInput({
  className,
  shortcut = "⌘ K",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { shortcut?: string | null }) {
  return (
    <div
      className={cn(
        "flex h-11 w-full items-center gap-3 rounded-md border border-neutral-200 bg-surface px-4 focus-within:border-primary-400",
        className,
      )}
    >
      <SearchIcon className="size-5 shrink-0 text-neutral-900" />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-body-lg text-neutral-900 placeholder:text-neutral-500 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
        {...props}
      />
      {shortcut ? (
        <kbd className="hidden shrink-0 rounded-xs border border-neutral-200 px-2 py-1 font-sans text-small font-medium text-neutral-700 sm:block">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
}
