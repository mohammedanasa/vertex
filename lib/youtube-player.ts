/**
 * Loader for the YouTube IFrame Player API.
 *
 * The lesson page needs the player's *real* position, not an estimate. Without
 * this, watch depth was derived from wall-clock time since the play click, so
 * an 8-minute lesson only registered as complete after ~7m12s of tab-open time
 * — watching the video normally never counted (see the git history of
 * `components/lesson/lesson-video.tsx`).
 *
 * This is still YouTube's own player embedded on the lesson page, per
 * AGENTS.md §7: no custom player, and the learner is never sent to youtube.com.
 * The API only lets the page ask the player where it is.
 *
 * ## Why the loading is guarded
 *
 * `onYouTubeIframeAPIReady` is a single global callback and the API is a global
 * singleton. Injecting the script twice — easy to do across client navigations
 * between lessons — clobbers the first callback and the player never
 * initialises. The module-level promise below means the script is fetched once
 * per page load no matter how many lessons are visited.
 */

/** The subset of the player API this app uses. */
export interface YouTubePlayer {
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  playVideo(): void;
  pauseVideo(): void;
  destroy(): void;
}

/**
 * Player states, from the IFrame API.
 *
 * `UNSTARTED` and `CUED` are the two that mean "loaded but not playing", which
 * is how a refused autoplay looks. `BUFFERING` is emphatically *not* one of
 * them — it is a working player mid-seek.
 */
export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

interface YouTubeApi {
  Player: new (
    element: HTMLElement | string,
    options: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YouTubePlayer }) => void;
        onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
        onError?: (event: { data: number }) => void;
      };
    },
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";

/** Resolves once, then is reused. Null until the first caller asks. */
let apiPromise: Promise<YouTubeApi> | null = null;

/**
 * Loads the IFrame API, returning the global `YT` object.
 *
 * Rejects if the script cannot load — blocked by an extension, offline, or a
 * strict network. Callers must treat that as "tracking degrades", never as
 * "playback fails": the plain iframe fallback still plays the video.
 */
export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API is browser-only"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    // Chain rather than overwrite: another loader may already be waiting, and
    // the API calls this callback exactly once.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube API loaded without a Player"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("error", () =>
        reject(new Error("YouTube API script failed to load")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      apiPromise = null;
      reject(new Error("YouTube API script failed to load"));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}
