import { PortableText, type PortableTextComponents } from "@portabletext/react";

/**
 * Portable Text serializers for the lesson body. Styled with the project's own
 * Tailwind scale rather than `@tailwindcss/typography`, which is not installed
 * (AGENTS.md §3: reuse the existing patterns before adding new ones).
 */
const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="text-body-lg text-neutral-500">{children}</p>
    ),
    h2: ({ children }) => (
      <h3 className="text-heading-3 font-semibold text-neutral-900">
        {children}
      </h3>
    ),
    h3: ({ children }) => (
      <h4 className="text-body-lg font-semibold text-neutral-900">{children}</h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-primary-500 pl-4 text-body-lg text-neutral-700 italic">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc space-y-2 pl-5 text-body-lg text-neutral-500">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal space-y-2 pl-5 text-body-lg text-neutral-500">
        {children}
      </ol>
    ),
  },
  marks: {
    strong: ({ children }) => (
      <strong className="font-semibold text-neutral-900">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded-xs bg-neutral-100 px-1.5 py-0.5 font-mono text-body text-neutral-900">
        {children}
      </code>
    ),
    link: ({ children, value }) => {
      // Author-supplied href: only http(s) is rendered as a link, so a
      // `javascript:` annotation degrades to plain text instead of executing.
      const href = typeof value?.href === "string" ? value.href : "";
      const isSafe = /^https?:\/\//i.test(href);

      if (!isSafe) return <>{children}</>;

      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-500 underline underline-offset-2 hover:text-primary-600"
        >
          {children}
        </a>
      );
    },
  },
};

export function LessonNotes({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) {
    return (
      <p className="text-body-lg text-neutral-500">
        No notes for this lesson yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PortableText value={value} components={components} />
    </div>
  );
}
