import { cn } from "@/lib/utils";

/** Design system 11 — rounded track with a Primary 500 fill and a percent label. */
export function ProgressBar({
  value,
  label = "complete",
  showLabel = true,
  className,
}: {
  value: number;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className="h-full rounded-full bg-primary-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <p className="shrink-0 text-body">
          <span className="font-semibold text-neutral-900">{pct}%</span>{" "}
          <span className="text-neutral-500">{label}</span>
        </p>
      ) : null}
    </div>
  );
}
