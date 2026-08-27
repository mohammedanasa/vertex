import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn("size-6 text-primary-500", className)}
    >
      <path
        d="M3 4.5h18L12 21 3 4.5Z"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <path d="M9 7.2h6L12 12.6 9 7.2Z" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-heading-3 font-bold tracking-tight text-neutral-900">
        Vertex
      </span>
    </span>
  );
}
