import {
  CheckCircleIcon,
  LockIcon,
  PlayCircleFilledIcon,
  SpinnerIcon,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type StatusKind =
  | "in-progress"
  | "completed"
  | "now-playing"
  | "locked";

/** Design system 10 — icon + label pairs for lesson state. */
const statuses = {
  "in-progress": {
    label: "In Progress",
    Icon: SpinnerIcon,
    iconClass: "text-primary-500",
  },
  completed: {
    label: "Completed",
    Icon: CheckCircleIcon,
    iconClass: "text-success-500",
  },
  "now-playing": {
    label: "Now Playing",
    Icon: PlayCircleFilledIcon,
    iconClass: "text-primary-500",
  },
  locked: {
    label: "Locked",
    Icon: LockIcon,
    iconClass: "text-neutral-900",
  },
} as const;

export function StatusIndicator({
  status,
  label,
  className,
}: {
  status: StatusKind;
  label?: string;
  className?: string;
}) {
  const { label: defaultLabel, Icon, iconClass } = statuses[status];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Icon className={cn("size-5 shrink-0", iconClass)} />
      <span className="text-body text-neutral-900">{label ?? defaultLabel}</span>
    </span>
  );
}
