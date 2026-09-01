"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";

import {
  MoreVerticalIcon,
  RotateCcwIcon,
  TrashIcon,
} from "@/components/icons";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

type Pending = "reset" | "remove" | null;

/**
 * Per-course actions on a My Learning card: reset progress, or remove the
 * course from the page.
 *
 * Both are real writes — they POST to `/api/progress`, which is the only thing
 * that touches the learner's progress document (AGENTS.md §5). Unlike
 * `BookmarkButton`, this control is not presentational and its effects survive a
 * reload.
 *
 * Both confirm before acting, in place of the menu items rather than through
 * `window.confirm`, so the copy can say exactly what each one does — the
 * distinction between "hidden" and "erased" matters and a native dialog cannot
 * carry it.
 *
 * After a successful write it calls `router.refresh()` so the server component
 * re-reads progress. Progress is deliberately not mirrored into client state:
 * one source of truth is the whole point of the backend this sits on.
 */
export function CourseActionsMenu({
  courseId,
  courseSlug,
  courseTitle,
}: {
  courseId: string;
  courseSlug: string;
  courseTitle: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  function close() {
    setOpen(false);
    setPending(null);
    setFailed(false);
  }

  // Dismiss on outside click and on Escape. Escape returns focus to the
  // trigger so keyboard users are not dropped at the top of the document.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function run(action: "reset-course" | "remove-course") {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, courseId }),
      });
      if (!response.ok) throw new Error(String(response.status));

      posthog.capture(
        action === "reset-course"
          ? ANALYTICS_EVENTS.COURSE_PROGRESS_RESET
          : ANALYTICS_EVENTS.COURSE_REMOVED_FROM_LEARNING,
        { course_slug: courseSlug, course_title: courseTitle },
      );

      close();
      router.refresh();
    } catch {
      // Keep the menu open and say so — silently doing nothing would read as a
      // dead button.
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Actions for ${courseTitle ?? "this course"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          // The card's title is a link; keep the click out of it.
          event.preventDefault();
          event.stopPropagation();
          setOpen((v) => !v);
          setPending(null);
          setFailed(false);
        }}
        className="flex size-9 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
      >
        <MoreVerticalIcon className="size-5" />
      </button>

      {open ? (
        <div
          role="menu"
          // right-0 so the panel opens inward from the card's edge and cannot
          // clip off-screen on a narrow viewport.
          className="absolute right-0 z-20 mt-1 w-64 rounded-md border border-neutral-200 bg-surface p-1 shadow-lg"
        >
          {pending === null ? (
            <>
              <MenuItem
                icon={<RotateCcwIcon className="size-4" />}
                onClick={() => setPending("reset")}
              >
                Reset progress
              </MenuItem>
              <MenuItem
                icon={<TrashIcon className="size-4" />}
                onClick={() => setPending("remove")}
              >
                Remove from My Learning
              </MenuItem>
            </>
          ) : (
            <div className="p-2">
              <p className="text-body font-medium text-neutral-900">
                {pending === "reset"
                  ? "Reset your progress?"
                  : "Remove this course?"}
              </p>
              <p className="mt-1 text-small text-neutral-500">
                {pending === "reset"
                  ? "This course goes back to 0%. It stays on My Learning so you can start it again."
                  : "It disappears from My Learning. Your completed lessons are kept, so opening the course again brings your progress back."}
              </p>

              {failed ? (
                <p className="mt-2 text-small text-primary-600">
                  That didn&apos;t save. Try again.
                </p>
              ) : null}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(pending === "reset" ? "reset-course" : "remove-course")
                  }
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-primary-500 px-3 text-body font-medium text-white hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300"
                >
                  {busy ? "Working…" : pending === "reset" ? "Reset" : "Remove"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPending(null);
                    setFailed(false);
                  }}
                  className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-neutral-200 bg-surface px-3 text-body font-medium text-neutral-900 hover:shadow-md disabled:text-neutral-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-body text-neutral-900 transition-colors hover:bg-neutral-100"
    >
      <span className="shrink-0 text-neutral-500">{icon}</span>
      {children}
    </button>
  );
}
