import type { SVGProps } from "react";

/**
 * Vertex icon set — 24x24 grid, 2px stroke, rounded line caps (design system 06).
 * Every icon draws with `currentColor` and defaults to 24px so it can be sized
 * with `size-*` utilities from the call site.
 */
export type IconProps = SVGProps<SVGSVGElement>;

function Outline({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

function Filled({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      width={24}
      height={24}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- outline */

export function BellIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M18 9a6 6 0 1 0-12 0c0 4.5-1.5 6-1.5 6h15S18 13.5 18 9Z" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </Outline>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.9-3.9" />
    </Outline>
  );
}

export function PlayCircleIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </Outline>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h6" />
    </Outline>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M6 4h12v16l-6-4.5L6 20V4Z" />
    </Outline>
  );
}

export function BarChartIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M5 20v-4M12 20V9M19 20V4" />
    </Outline>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Outline>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Outline>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m9 5 7 7-7 7" />
    </Outline>
  );
}

/* ----------------------------------------------------------------- filled */

export function BellFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M12 2a6 6 0 0 0-6 6c0 4.4-1.4 6.2-1.7 6.5A1 1 0 0 0 5 16h14a1 1 0 0 0 .7-1.5C19.4 14.2 18 12.4 18 8a6 6 0 0 0-6-6Z" />
      <path d="M9.8 18a2.4 2.4 0 0 0 4.4 0H9.8Z" />
    </Filled>
  );
}

export function SearchFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path
        fillRule="evenodd"
        d="M11 3a8 8 0 1 0 4.9 14.3l3.4 3.4a1.2 1.2 0 0 0 1.7-1.7l-3.4-3.4A8 8 0 0 0 11 3Zm0 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11Z"
        clipRule="evenodd"
      />
    </Filled>
  );
}

export function PlayCircleFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.5 6.2 6 3.4a.5.5 0 0 1 0 .8l-6 3.4a.5.5 0 0 1-.8-.4V8.6a.5.5 0 0 1 .8-.4Z"
        clipRule="evenodd"
      />
    </Filled>
  );
}

export function DocumentFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M13.5 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5L13.5 2Zm-4 11h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2Zm0 4h5a1 1 0 1 1 0 2h-5a1 1 0 1 1 0-2Z" />
      <path d="M14 2.5V7a1 1 0 0 0 1 1h4.5L14 2.5Z" opacity={0.55} />
    </Filled>
  );
}

export function BookmarkFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M6 4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1.6.8L12 17.2l-4.4 3.6A1 1 0 0 1 6 20V4Z" />
    </Filled>
  );
}

export function BarChartFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <rect x="4" y="14" width="4" height="6" rx="1" />
      <rect x="10" y="9" width="4" height="11" rx="1" />
      <rect x="16" y="4" width="4" height="16" rx="1" />
    </Filled>
  );
}

export function ClockFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path
        fillRule="evenodd"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4a1 1 0 0 1 1 1v4.4l2.6 1.7a1 1 0 1 1-1.1 1.7l-3-2A1 1 0 0 1 11 12V7a1 1 0 0 1 1-1Z"
        clipRule="evenodd"
      />
    </Filled>
  );
}

export function UserFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M12 14c-4 0-7 2.4-7 5.2 0 .5.4.8.9.8h12.2c.5 0 .9-.3.9-.8 0-2.8-3-5.2-7-5.2Z" />
    </Filled>
  );
}

export function ChevronRightFilledIcon(props: IconProps) {
  return (
    <Filled {...props}>
      <path d="M9.3 4.3a1.2 1.2 0 0 0 0 1.7l6 6-6 6a1.2 1.2 0 1 0 1.7 1.7l6.8-6.8a1.2 1.2 0 0 0 0-1.7L11 4.3a1.2 1.2 0 0 0-1.7 0Z" />
    </Filled>
  );
}

/* ------------------------------------------------ supporting (UI plumbing) */

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m15 5-7 7 7 7" />
    </Outline>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m5 9 7 7 7-7" />
    </Outline>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M4 12h16" />
      <path d="m14 6 6 6-6 6" />
    </Outline>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </Outline>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </Outline>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="4.5" y="10" width="15" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </Outline>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </Outline>
  );
}

export function FolderIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </Outline>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </Outline>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </Outline>
  );
}

export function TargetIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12 21 3" />
    </Outline>
  );
}

export function AccessibilityIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M4.5 9h15" />
      <path d="M12 9v6" />
      <path d="m9 21 3-6 3 6" />
    </Outline>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
    </Outline>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M15.5 6.2a3 3 0 0 1 0 5.8" />
      <path d="M17.5 13.3a5 5 0 0 1 3 5.2" />
    </Outline>
  );
}

export function LayersIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" />
      <path d="m4 12 8 4.5 8-4.5" />
      <path d="m4 16.5 8 4.5 8-4.5" />
    </Outline>
  );
}

export function WorkflowIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <rect x="3.5" y="3.5" width="6" height="6" rx="1.2" />
      <rect x="14.5" y="14.5" width="6" height="6" rx="1.2" />
      <path d="M6.5 9.5v3a2 2 0 0 0 2 2h3" />
      <path d="M17.5 14.5v-3a2 2 0 0 0-2-2h-3" />
    </Outline>
  );
}

export function GaugeIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M4 15a8 8 0 1 1 16 0" />
      <path d="M12 15 16 9" />
      <path d="M12 15h.01" />
    </Outline>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M12 3c2.5 1.5 4 4.5 4 8.5-1 .5-2.5 1-4 1s-3-.5-4-1c0-4 1.5-7 4-8.5Z" />
      <circle cx="12" cy="10" r="1.3" />
      <path d="M9 15.5 6.5 18l.5-3.2" />
      <path d="M15 15.5 17.5 18l-.5-3.2" />
      <path d="M10.5 19.5h3" />
    </Outline>
  );
}

export function CodeBracketIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="m9 8-4.5 4L9 16" />
      <path d="m15 8 4.5 4-4.5 4" />
    </Outline>
  );
}

export function PuzzleIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M9 4.5h3a1.5 1.5 0 0 1 0 3 1.5 1.5 0 0 0 0 3h3.5V14a1.5 1.5 0 0 1-3 0 1.5 1.5 0 0 0-3 0v3.5H6a1.5 1.5 0 0 1 0-3 1.5 1.5 0 0 0 0-3H4.5V8A1.5 1.5 0 0 1 6 6.5H9v-2Z" />
    </Outline>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" />
      <path d="m9 12 2 2 4-4" />
    </Outline>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M11 4 12.3 8 16 9.3 12.3 10.6 11 14.6 9.7 10.6 6 9.3 9.7 8 11 4Z" />
      <path d="M17.5 14.5 18.2 16.5 20 17.2 18.2 17.9 17.5 20 16.8 17.9 15 17.2 16.8 16.5 17.5 14.5Z" />
    </Outline>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <Outline {...props}>
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45.95 1.15.95 1.9V16h5.3v-.3c0-.75.35-1.45.95-1.9A6 6 0 0 0 12 3Z" />
    </Outline>
  );
}
