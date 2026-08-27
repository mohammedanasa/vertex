import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "video" | "lesson" | "popular";

/** Design system 09 — uppercase pill, 12px semibold, letter-spaced. */
const tones: Record<BadgeTone, string> = {
  video: "bg-primary-100 text-primary-500",
  lesson: "bg-accent-100 text-accent-600",
  popular: "bg-primary-100 text-primary-500",
};

export function Badge({
  tone = "video",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xs px-2 py-1 text-small font-semibold tracking-wider uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
