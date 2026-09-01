import { NextResponse } from "next/server";

import { runSearch } from "@/lib/search/search";
import { parseSortOption } from "@/lib/search/types";

/**
 * Server-side search endpoint.
 *
 * The MCP connection, the read token, and the model key all stay here — the
 * browser never touches any of them (AGENTS.md §5). Read-only: search performs
 * no writes.
 *
 * The search page renders results server-side and does not need this route; it
 * exists for client-driven searching and for verifying the pipeline with curl.
 */

// The MCP client and the AI SDK need Node APIs, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { query, sort } = (body ?? {}) as { query?: unknown; sort?: unknown };

  if (typeof query !== "string" || !query.trim()) {
    return NextResponse.json(
      { error: "A non-empty 'query' string is required." },
      { status: 400 },
    );
  }

  const result = await runSearch(query, parseSortOption(sort), "api");

  // An upstream failure is a 503, not a 200 with an empty list — a caller
  // should be able to tell "nothing matched" from "search is down".
  return NextResponse.json(result, { status: result.error ? 503 : 200 });
}
