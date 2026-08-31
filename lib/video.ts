/**
 * Video URL handling for lesson playback.
 *
 * Playback stays on the site through the provider's own embed (AGENTS.md §7),
 * so an authored `videoUrl` is never used as an iframe `src` directly. It is
 * parsed down to an id and re-composed into a known-good embed URL, which means
 * a malformed or hostile authored URL cannot point the frame somewhere else.
 *
 * Only YouTube is handled: it is the only provider present in the dataset, and
 * AGENTS.md §9 says a provider is not supported until both ingestion and
 * playback exist for it.
 */

const YOUTUBE_ID = /^[\w-]{11}$/;

/** Extracts a YouTube video id from a watch, short, or embed URL. */
export function parseYouTubeId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;

  let url: URL;
  try {
    url = new URL(videoUrl);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1);
  } else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/embed/") || url.pathname.startsWith("/v/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
  }

  return id && YOUTUBE_ID.test(id) ? id : null;
}

/**
 * Builds the privacy-mode embed URL, seeking with YouTube's own `start`
 * parameter rather than a custom player.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  { startSeconds = 0, autoplay = false }: { startSeconds?: number; autoplay?: boolean } = {},
): string {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (startSeconds > 0) params.set("start", String(Math.floor(startSeconds)));
  if (autoplay) params.set("autoplay", "1");

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Reads a start offset off the URL. Accepts `t` and the `startSeconds` alias
 * that search results link with. Anything non-finite or negative is ignored
 * rather than clamped, so a junk param just starts the video at zero.
 */
export function parseStartSeconds(
  value: string | string[] | undefined,
): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return 0;

  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
}

/** Formats a second offset as a player timestamp, e.g. 754 -> "12:34". */
export function formatTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}
