"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton } from "@clerk/nextjs";
import posthog from "posthog-js";
import { BookmarkIcon } from "@/components/icons";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";

interface CourseCTAButtonsProps {
  continueHref: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string | null;
  /** The lesson the Continue control resumes into, for the resume event. */
  continueLessonSlug: string | null;
  /** Whether this learner has joined the course. False when signed out. */
  isEnrolled: boolean;
  /** Whether every lesson is done, which changes the label to Review. */
  isComplete: boolean;
  /** False for a signed-out visitor, who gets a sign-in prompt instead. */
  isSignedIn: boolean;
}

const PRIMARY =
  "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 text-body-lg font-medium text-white shadow-sm hover:bg-primary-600 disabled:bg-primary-100 disabled:text-primary-300 disabled:shadow-none";

/**
 * The course page's primary actions.
 *
 * The primary button reflects enrollment state rather than always reading
 * "Continue Learning":
 *
 *   not enrolled  -> Enroll        (writes, then refreshes)
 *   enrolled      -> Continue Learning
 *   complete      -> Review Course
 *
 * Enrolling is what puts a course on My Learning. Before this existed the only
 * way in was watching a lesson to 90%, so a learner could click through a course
 * and never see it listed.
 *
 * Signed-out visitors still get the full page — course pages are public
 * (AGENTS.md §7) — but the button opens Clerk's sign-in rather than posting a
 * write that would 401.
 */
export function CourseCTAButtons({
  continueHref,
  courseId,
  courseSlug,
  courseTitle,
  continueLessonSlug,
  isEnrolled,
  isComplete,
  isSignedIn,
}: CourseCTAButtonsProps) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();

  /**
   * Continue Learning is both a CTA click and a resume. The two are captured
   * separately because they answer different questions — one is about this
   * button, the other about resume behaviour across every surface that offers
   * it — and a single event cannot serve both funnels.
   */
  function continueLearning() {
    posthog.capture(ANALYTICS_EVENTS.RESUME_USED, {
      source: "course_cta",
      course_slug: courseSlug,
      lesson_slug: continueLessonSlug,
      start_seconds: null,
    });
  }

  async function enroll() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll-course", courseId }),
      });
      if (!response.ok) throw new Error(String(response.status));

      posthog.capture(ANALYTICS_EVENTS.COURSE_ENROLLED, {
        source: "course_cta",
        course_slug: courseSlug,
        course_title: courseTitle,
      });

      // Re-render the server component so the button reflects the new state.
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <button type="button" className={PRIMARY}>
            Enroll
          </button>
        </SignInButton>
      ) : isEnrolled ? (
        <Link
          href={continueHref}
          className={PRIMARY}
          onClick={() => {
            posthog.capture("course_continue_learning_clicked", {
              course_slug: courseSlug,
              course_title: courseTitle,
            });
            continueLearning();
          }}
        >
          {isComplete ? "Review Course" : "Continue Learning"}
        </Link>
      ) : (
        <button type="button" className={PRIMARY} disabled={busy} onClick={enroll}>
          {busy ? "Enrolling…" : "Enroll"}
        </button>
      )}

      <button
        type="button"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-surface px-4 text-body-lg font-medium text-neutral-900 hover:shadow-md"
        onClick={() =>
          posthog.capture("course_bookmarked", {
            course_slug: courseSlug,
            course_title: courseTitle,
          })
        }
      >
        <BookmarkIcon className="size-5" />
        Bookmark
      </button>

      {failed ? (
        <p className="w-full text-body text-primary-600">
          That didn&apos;t save. Try again.
        </p>
      ) : null}
    </div>
  );
}
