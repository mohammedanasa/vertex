"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

/**
 * Syncs the signed-in Clerk user to PostHog.
 *
 * Only the Clerk user id is sent. No username, email or name is attached as a
 * person property: the id is the sole identifier this app tracks people by.
 *
 * `reset()` fires only on a real signed-in -> signed-out transition, tracked
 * with a ref. Calling it on an initially anonymous load would throw away the
 * anonymous id and the history attached to it, which is why the previous
 * session's state has to be remembered rather than inferred from `isSignedIn`
 * alone.
 *
 * Rendered once in the root layout.
 */
export function PostHogIdentifier() {
  const { isLoaded, isSignedIn, user } = useUser();

  // Whether the *previous* settled render had someone signed in. Starts false,
  // so a first load that is already anonymous never triggers a reset.
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      posthog.identify(user.id);
      wasSignedIn.current = true;
      return;
    }

    if (wasSignedIn.current) {
      posthog.reset();
      wasSignedIn.current = false;
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
