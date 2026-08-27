import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChartIcon,
  ClockIcon,
  DocumentIcon,
  ExternalLinkIcon,
  FolderIcon,
  PlayCircleFilledIcon,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Design system 12 — white surface, 16px radius, 1px Neutral 200 border. */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-neutral-200 bg-surface p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MetaItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-small text-neutral-500">
      <span className="shrink-0 text-neutral-500">{icon}</span>
      {children}
    </span>
  );
}

export function CourseCard({
  title,
  description,
  level,
  duration,
  moduleCount,
  logo,
  logoClassName,
  href,
  className,
}: {
  title: string;
  description: string;
  level: string;
  duration: string;
  moduleCount: number;
  logo?: ReactNode;
  logoClassName?: string;
  href?: string;
  className?: string;
}) {
  const heading = (
    <h3 className="font-display text-heading-3 font-bold text-neutral-900">
      {title}
    </h3>
  );

  return (
    <Card className={className}>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-neutral-900 text-heading-2 font-semibold text-white",
            logoClassName,
          )}
        >
          {logo}
        </span>
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="hover:text-primary-500">
              {heading}
            </Link>
          ) : (
            heading
          )}
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-200 pt-4">
        <MetaItem icon={<BarChartIcon className="size-3.5" />}>{level}</MetaItem>
        <MetaItem icon={<ClockIcon className="size-3.5" />}>{duration}</MetaItem>
        <MetaItem icon={<FolderIcon className="size-3.5" />}>
          {moduleCount} modules
        </MetaItem>
      </div>
    </Card>
  );
}

export function LessonVideoCard({
  title,
  description,
  lessonLabel,
  timestamp,
  href,
  className,
}: {
  title: string;
  description: string;
  lessonLabel: string;
  timestamp: string;
  href?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Badge tone="video" className="self-start">
        Video
      </Badge>
      <h3 className="mt-3 text-heading-3 font-semibold text-neutral-900">
        {title}
      </h3>
      <p className="mt-2 text-body text-neutral-500">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-neutral-500">
          {lessonLabel} <span className="px-1">·</span> {timestamp}
        </p>
        <Link
          href={href ?? "#"}
          className="inline-flex items-center gap-2 text-body font-medium text-primary-500 hover:text-primary-600"
        >
          <PlayCircleFilledIcon className="size-5" />
          Watch from {timestamp}
        </Link>
      </div>
    </Card>
  );
}

export function LessonCard({
  title,
  description,
  moduleLabel,
  href,
  className,
}: {
  title: string;
  description: string;
  moduleLabel: string;
  href?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <Badge tone="lesson" className="self-start">
        Lesson
      </Badge>
      <h3 className="mt-3 font-display text-heading-3 font-bold text-neutral-900">
        {title}
      </h3>
      <p className="mt-2 text-body text-neutral-500">{description}</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-neutral-500">{moduleLabel}</p>
        <Link
          href={href ?? "#"}
          className="inline-flex items-center gap-2 text-body font-medium text-primary-500 hover:text-primary-600"
        >
          View lesson
          <ExternalLinkIcon className="size-4" />
        </Link>
      </div>
    </Card>
  );
}

export function ResourceCard({
  title,
  description,
  fileType,
  fileSize,
  href,
  className,
}: {
  title: string;
  description: string;
  fileType: string;
  fileSize: string;
  href?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="flex items-start gap-3">
        <DocumentIcon className="size-6 shrink-0 text-neutral-900" />
        <div className="min-w-0">
          <h3 className="font-display text-heading-3 font-bold text-neutral-900">
            {title}
          </h3>
          <p className="mt-1 text-body text-neutral-500">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-body text-neutral-500">
          {fileType} <span className="px-1">·</span> {fileSize}
        </p>
        <Link
          href={href ?? "#"}
          aria-label={`Open ${title}`}
          className="text-primary-500 hover:text-primary-600"
        >
          <ExternalLinkIcon className="size-5" />
        </Link>
      </div>
    </Card>
  );
}
