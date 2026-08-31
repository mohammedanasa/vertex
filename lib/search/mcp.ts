import "server-only";

// `createMCPClient` lives in `@ai-sdk/mcp`; it is not re-exported from `ai` v7.
import { createMCPClient } from "@ai-sdk/mcp";

import { apiVersion, dataset, projectId, token } from "@/sanity/lib/env";

/**
 * Connection to the Sanity Context MCP server.
 *
 * This module is server-only. The read token authenticates the MCP call and
 * must never reach the browser (AGENTS.md §12), which is why the search UI
 * talks to our own route and never to this endpoint.
 */

const CONTEXT_API_VERSION = "v2026-03-03";

/**
 * The MCP endpoint. A slug-suffixed URL applies a Sanity Context document's
 * configuration; the base URL works without one. The dataset currently has no
 * `sanity.agentContext` document, so this falls back to the base URL until
 * `sanity/context/vertex-search.json` is imported and the slug is set in env.
 */
function mcpUrl(): string {
  const configured = process.env.SANITY_CONTEXT_MCP_URL;
  if (configured) return configured;

  const base = `https://api.sanity.io/${CONTEXT_API_VERSION}/context/mcp/${projectId}/${dataset}`;
  const slug = process.env.SANITY_CONTEXT_SLUG;
  return slug ? `${base}/${slug}` : base;
}

const authHeaders = { Authorization: `Bearer ${token}` };

/**
 * Cached schema overview, injected into the system prompt.
 *
 * Fetching it up front removes a tool round-trip on every search and keeps the
 * prompt prefix stable for caching. Because the cache lives at module scope,
 * edits to the Context document only reach the agent after a server restart —
 * the documented trade-off in AGENTS.md §12.
 */
let initialContextCache: Promise<string | null> | null = null;

export function fetchInitialContext(): Promise<string | null> {
  initialContextCache ??= (async () => {
    try {
      const url = new URL(mcpUrl());
      // Append to the path, preserving any query params already on the URL.
      url.pathname = `${url.pathname.replace(/\/$/, "")}/initial-context`;

      const response = await fetch(url, { headers: authHeaders });
      if (!response.ok) {
        console.error(
          `[search] initial-context failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }
      return await response.text();
    } catch (error) {
      // A missing schema overview degrades latency, not correctness — the model
      // can still call the schema tools itself, so this is not fatal.
      console.error("[search] initial-context error", error);
      return null;
    }
  })();

  return initialContextCache;
}

/** Opens an MCP client. Callers must close it when the request finishes. */
export async function createSanityContextClient() {
  return createMCPClient({
    transport: { type: "http", url: mcpUrl(), headers: authHeaders },
  });
}

export { apiVersion };
