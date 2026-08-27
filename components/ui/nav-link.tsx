import type { ComponentProps } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Design system 13 — active nav item in Primary 500. */
export function NavLink({
  active = false,
  className,
  ...props
}: ComponentProps<typeof Link> & { active?: boolean }) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cn(
        "text-body-lg transition-colors",
        active
          ? "text-primary-500"
          : "text-neutral-900 hover:text-primary-500",
        className,
      )}
      {...props}
    />
  );
}
