import Image from "next/image";
import Link from "next/link";

import { ChevronRightIcon, PlayCircleFilledIcon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { formatTimestamp } from "@/lib/video";
import { urlFor } from "@/sanity/lib/image";
import type { VideoResult } from "@/lib/search/types";

import { CourseLine, LessonMeta } from "./result-meta";

/**
 * A lesson's video matched at a specific moment.
 *
 * The moment is resolved server-side from the lesson's `video` document —
 * chapters first, transcript as the fallback (AGENTS.md §7).
 *
 * The action keeps the learner on the site — it links to the lesson page with a
 * start offset, which `lib/video.ts` turns into the provider's own `start`
 * parameter. It never links out to the provider (AGENTS.md §7).
 */
export function VideoResultCard({ result }: { result: VideoResult }) {
  const href = `/lessons/${result.lessonSlug}?startSeconds=${result.startSeconds}`;
  const timestamp = formatTimestamp(result.startSeconds);

  const poster = result.thumbnail?.asset?._ref
    ? urlFor(result.thumbnail).width(560).height(315).fit("crop").url()
    : null;

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-surface p-4 sm:flex-row sm:gap-5">
      <Link
        href={href}
        aria-label={`Watch ${result.lessonTitle} from ${timestamp}`}
        className="group relative block w-full shrink-0 overflow-hidden rounded-md bg-neutral-900 sm:w-64"
      >
        <span className="block aspect-video">
          {poster ? (
            <Image
              src={poster}
              alt=""
              width={560}
              height={315}
              className="size-full object-cover"
            />
          ) : null}
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <PlayCircleFilledIcon className="size-12 text-white/90 transition-transform group-hover:scale-110" />
        </span>
        {result.clipSeconds ? (
          <span className="absolute right-2 bottom-2 rounded-xs bg-neutral-900/85 px-1.5 py-0.5 text-small font-medium text-white">
            {formatTimestamp(result.clipSeconds)}
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <CourseLine
            title={result.courseTitle}
            slug={result.courseSlug}
            image={result.courseImage}
          />
          <Badge tone="video">Video</Badge>
        </div>

        <h3 className="mt-2 font-display text-heading-3 font-bold text-neutral-900">
          <Link href={href} className="hover:text-primary-500">
            {result.lessonTitle}
          </Link>
        </h3>

        {result.description ? (
          <p className="mt-1 text-body text-neutral-500">{result.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <LessonMeta result={result} />
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-body font-medium text-primary-500 hover:text-primary-600"
          >
            <PlayCircleFilledIcon className="size-5" />
            Watch from {timestamp}
            <ChevronRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
