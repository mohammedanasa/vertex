"use client";

import posthog from "posthog-js";
import {
  CodeBracketIcon,
  DocumentIcon,
  ExternalLinkIcon,
} from "@/components/icons";

export interface LessonResource {
  _key: string;
  type: string | null;
  title: string | null;
  description: string | null;
  url: string | null;
}

function ResourceIcon({ type }: { type: string | null }) {
  const className = "size-5 shrink-0 text-neutral-900";
  return type === "code" ? (
    <CodeBracketIcon className={className} />
  ) : (
    <DocumentIcon className={className} />
  );
}

export function LessonResources({
  resources,
  lessonSlug,
}: {
  resources: LessonResource[];
  lessonSlug: string;
}) {
  // Author-supplied URLs; only http(s) is linkable.
  const linkable = resources.filter(
    (resource) => resource.url && /^https?:\/\//i.test(resource.url),
  );

  if (linkable.length === 0) return null;

  return (
    <section>
      <h3 className="text-heading-3 font-semibold text-neutral-900">
        Resources
      </h3>
      <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {linkable.map((resource) => (
          <li key={resource._key}>
            <a
              href={resource.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                posthog.capture("lesson_resource_clicked", {
                  lesson_slug: lessonSlug,
                  resource_title: resource.title,
                  resource_type: resource.type,
                })
              }
              className="flex h-full flex-col rounded-lg border border-neutral-200 bg-surface p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <ResourceIcon type={resource.type} />
                <span className="min-w-0 flex-1 text-body font-semibold text-neutral-900">
                  {resource.title}
                </span>
                <ExternalLinkIcon className="size-4 shrink-0 text-neutral-500" />
              </div>
              {resource.description ? (
                <p className="mt-2 text-small text-neutral-500">
                  {resource.description}
                </p>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
