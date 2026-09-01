import { auth } from "@clerk/nextjs/server";
import { PostHog } from "posthog-node";

/** Distinct id used for signed-out traffic, so the event is kept, not dropped. */
const ANONYMOUS_DISTINCT_ID = "anonymous";

let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is configured",
      );
    }
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(token, {
      host,
      flushAt: 1,
      flushInterval: 0,
    });
  }

  return posthogClient;
}

/**
 * Captures one server-side event and waits for it to actually send.
 *
 * `capture()` only enqueues; the HTTP send happens afterwards. A Next.js route
 * handler or a dynamic server component is torn down per invocation, so without
 * the awaited flush the event is silently dropped. The client is a shared
 * singleton, so this is `flush()` — `shutdown()` would kill it for every later
 * request in the same process.
 *
 * The distinct id is the Clerk user id resolved here on the server, never a
 * value passed in from the browser, so a client cannot attribute an event to
 * someone else. Signed-out traffic falls back to an anonymous id, which keeps
 * the event rather than dropping it.
 *
 * Analytics must never break a page: every failure — an unconfigured token, a
 * network error, a Clerk lookup outside a request scope — is swallowed after
 * being logged. A search does not fail because PostHog is down.
 */
export async function captureServerEvent(
  event: string,
  properties: Record<string, unknown>,
): Promise<void> {
  const client = getPostHogClient();
  if (!client) return;

  try {
    let distinctId: string;
    try {
      const { userId } = await auth();
      distinctId = userId ?? ANONYMOUS_DISTINCT_ID;
    } catch {
      // `auth()` throws outside a request scope. The event is still worth
      // keeping; it just cannot be attributed to a person.
      distinctId = ANONYMOUS_DISTINCT_ID;
    }

    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        // Lets a dashboard tell this apart from the browser-side event of the
        // same feature.
        captured_from: "server",
        // Anonymous server traffic should not mint a person profile — that
        // would create one throwaway person per signed-out search.
        $process_person_profile: distinctId !== ANONYMOUS_DISTINCT_ID,
      },
    });

    await client.flush();
  } catch (error) {
    console.error(`[posthog] failed to capture "${event}"`, error);
  }
}
