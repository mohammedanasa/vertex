import Link from "next/link";
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

/**
 * The wordmark, linking home by default.
 *
 * `href={null}` renders it as a plain span instead. The design system gallery
 * shows the logo as a specimen, where a navigating anchor would be wrong.
 */
export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const content = (
    <>
      <LogoMark />
      <span className="text-heading-3 font-bold tracking-tight text-neutral-900">
        Vertex
      </span>
    </>
  );

  const classes = cn("inline-flex items-center gap-2", className);

  if (href === null) {
    return <span className={classes}>{content}</span>;
  }

  return (
    <Link
      href={href}
      // "Vertex" is already the visible text, so the label names the
      // destination rather than repeating the brand.
      aria-label="Vertex, home"
      className={cn(classes, "rounded-sm hover:opacity-80")}
    >
      {content}
    </Link>
  );
}
