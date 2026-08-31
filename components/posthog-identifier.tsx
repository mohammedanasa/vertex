"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";

/**
 * Syncs the signed-in Clerk user to PostHog.
 * Calls identify() when the user is loaded, and reset() when signed out.
 * This component is rendered once in the root layout.
 */
export function PostHogIdentifier() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      posthog.identify(user.id, {
        username: user.username ?? undefined,
      });
    }
  }, [isLoaded, isSignedIn, user]);

  return null;
}
