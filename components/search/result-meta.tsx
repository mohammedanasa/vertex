import Image from "next/image";
import Link from "next/link";

import { DocumentIcon, FolderIcon } from "@/components/icons";
import { urlFor } from "@/sanity/lib/image";
import type { SearchImage, SearchResult } from "@/lib/search/types";

/**
 * Pieces shared by both result cards, so the video and lesson cards stay
 * visually identical everywhere the design shows them identical.
 */

/** Course line: small square course mark plus the course name. */
export function CourseLine({
  title,
  slug,
  image,
}: {
  title: string;
  slug: string;
  image: SearchImage;
}) {
  const src = image?.asset?._ref
    ? urlFor(image).width(64).height(64).fit("crop").url()
    : null;

  return (
    <Link
      href={`/courses/${slug}`}
      className="inline-flex items-center gap-2 text-small text-neutral-700 hover:text-primary-500"
    >
      <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-neutral-100">
        {src ? (
          <Image src={src} alt="" width={24} height={24} className="size-full object-cover" />
        ) : (
          <span className="text-small font-semibold text-neutral-500">
            {title.charAt(0)}
          </span>
        )}
      </span>
      {title}
    </Link>
  );
}

/**
 * "Lesson 5.1 · Data Fetching and Caching".
 *
 * Every part is omitted when the underlying data is missing rather than
 * guessed at, so the card never shows a lesson number that isn't real.
 */
export function LessonMeta({ result }: { result: SearchResult }) {
  const hasLabel = Boolean(result.lessonLabel);
  const hasModule = Boolean(result.moduleTitle);
  if (!hasLabel && !hasModule) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-neutral-500">
      {hasLabel ? (
        <span className="inline-flex items-center gap-1.5">
          <DocumentIcon className="size-3.5 shrink-0" />
          Lesson {result.lessonLabel}
        </span>
      ) : null}
      {hasLabel && hasModule ? <span aria-hidden>·</span> : null}
      {hasModule ? (
        <span className="inline-flex items-center gap-1.5">
          <FolderIcon className="size-3.5 shrink-0" />
          {result.moduleTitle}
        </span>
      ) : null}
    </div>
  );
}
