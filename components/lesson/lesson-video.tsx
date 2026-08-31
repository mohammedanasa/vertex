"use client";

import { useState } from "react";
import Image from "next/image";
import posthog from "posthog-js";
import { PlayCircleFilledIcon } from "@/components/icons";
import { buildYouTubeEmbedUrl, formatTimestamp } from "@/lib/video";

interface LessonVideoProps {
  videoId: string | null;
  posterUrl: string | null;
  title: string;
  startSeconds: number;
  lessonSlug: string;
  courseSlug: string | null;
}

/**
 * Playback stays on the site through YouTube's own embed (AGENTS.md §7) — no
 * custom player, and no link out to youtube.com.
 *
 * The poster is a click-to-play surface rather than an iframe mounted on load:
 * that keeps the 120 lesson pages from each pulling YouTube's player on mount,
 * and it makes the play a real user gesture so autoplay is allowed. A start
 * offset in the URL (a search result linking to a moment) skips the poster and
 * mounts the player already seeked.
 */
export function LessonVideo({
  videoId,
  posterUrl,
  title,
  startSeconds,
  lessonSlug,
  courseSlug,
}: LessonVideoProps) {
  const [isPlaying, setIsPlaying] = useState(startSeconds > 0);

  function play() {
    setIsPlaying(true);
    posthog.capture("video_played", {
      lesson_slug: lessonSlug,
      course_slug: courseSlug,
      start_seconds: startSeconds,
    });
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-900">
      {isPlaying && videoId ? (
        <iframe
          src={buildYouTubeEmbedUrl(videoId, { startSeconds, autoplay: true })}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <>
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 700px, 100vw"
              className="object-cover"
              priority
            />
          ) : null}

          {videoId ? (
            <button
              type="button"
              onClick={play}
              aria-label={
                startSeconds > 0
                  ? `Play ${title} from ${formatTimestamp(startSeconds)}`
                  : `Play ${title}`
              }
              className="group absolute inset-0 flex items-center justify-center bg-neutral-900/30 transition-colors hover:bg-neutral-900/45"
            >
              <span className="flex size-16 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition-transform group-hover:scale-105">
                <PlayCircleFilledIcon className="size-9" />
              </span>
            </button>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 px-6 text-center">
              <p className="text-body text-white">
                This lesson&rsquo;s video is unavailable.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
