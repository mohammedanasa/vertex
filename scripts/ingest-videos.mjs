#!/usr/bin/env node
/**
 * Offline video ingestion (AGENTS.md §9).
 *
 * Builds one `video` document per unique video URL in the dataset, holding the
 * source's chapter markers as a table of contents and the transcript split into
 * short timestamped chunks.
 *
 * This is offline tooling. It never runs in the request path (§5), and it is the
 * only thing that touches SANITY_API_WRITE_TOKEN.
 *
 * Usage:
 *   node scripts/ingest-videos.mjs [--dry-run] [--limit=N] [--concurrency=N]
 *
 * ---------------------------------------------------------------------------
 * Why captions are fetched the way they are
 *
 * The obvious approach — scrape `captionTracks` off the watch page HTML and GET
 * that `baseUrl` — is dead. YouTube now returns HTTP 200 with a zero-byte body
 * for those unsigned URLs. Verified against this dataset's own videos.
 *
 * The working path is the InnerTube player endpoint that the clients themselves
 * call. It returns a *signed* caption `baseUrl` which does serve the transcript.
 * If you "simplify" this back to the watch-page URL, ingestion will silently
 * produce zero chunks for every video.
 *
 * Chapters are the opposite: they are only in the watch page HTML, not in the
 * ANDROID player response. So each video costs one request to each source.
 * ---------------------------------------------------------------------------
 */

import {readFileSync} from 'node:fs'
import {createClient} from '@sanity/client'

// --- Tunables ---------------------------------------------------------------

/** Target chunk length. Raw cues are ~2s/~40 chars — far too granular to be a
 *  useful search unit, and 150–530 of them per video. */
const CHUNK_TARGET_SECONDS = 30
const CHUNK_TARGET_CHARS = 400

/** Politeness: 120 videos x 2 requests. Kept low and spaced so the run does not
 *  look like an attack and does not get throttled part-way through. */
const DEFAULT_CONCURRENCY = 4
const REQUEST_DELAY_MS = 250

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
const INNERTUBE_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 11)'
const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const INNERTUBE_URL = `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`

// --- Env --------------------------------------------------------------------

/** Minimal .env reader — avoids a dependency for a script run by hand. */
function loadEnvFile(path) {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch {
    return {}
  }

  const env = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue
    env[match[1]] = match[2].trim().replace(/^["'](.*)["']$/, '$1')
  }
  return env
}

const fileEnv = loadEnvFile(new URL('../.env.local', import.meta.url).pathname)
const env = {...fileEnv, ...process.env}

// --- Args -------------------------------------------------------------------

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limit = Number(args.find((a) => a.startsWith('--limit='))?.split('=')[1]) || Infinity
const concurrency =
  Number(args.find((a) => a.startsWith('--concurrency='))?.split('=')[1]) || DEFAULT_CONCURRENCY

// --- YouTube URL parsing ----------------------------------------------------

const YOUTUBE_ID = /^[\w-]{11}$/

/**
 * Extracts a YouTube video id from a watch, short, or embed URL.
 *
 * Mirrors `parseYouTubeId` in lib/video.ts. It is duplicated rather than
 * imported because that module is TypeScript inside the Next.js app, and this
 * script must stay outside the app so it can never be pulled into the request
 * path. Keep the two in sync.
 */
function parseYouTubeId(videoUrl) {
  if (!videoUrl) return null

  let url
  try {
    url = new URL(videoUrl)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.replace(/^www\./, '')
  let id = null

  if (host === 'youtu.be') {
    id = url.pathname.slice(1)
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      id = url.searchParams.get('v')
    } else if (url.pathname.startsWith('/embed/') || url.pathname.startsWith('/v/')) {
      id = url.pathname.split('/')[2] ?? null
    }
  }

  return id && YOUTUBE_ID.test(id) ? id : null
}

/**
 * Builds the document id, stripping what the datastore rejects (AGENTS.md §9).
 *
 * Sanity ids allow [A-Za-z0-9._-], but it also rejects a dot-separated element
 * that *starts* with `-` — and YouTube ids legitimately do (`-QVoIxEpFkM`).
 * Such an id is prefixed with `v` rather than having the dash removed, so the
 * mapping back to the video id stays unambiguous.
 */
function toDocumentId(videoId) {
  const cleaned = videoId.replace(/[^A-Za-z0-9._-]/g, '')
  return `video.${cleaned.startsWith('-') ? `v${cleaned}` : cleaned}`
}

// --- Text helpers -----------------------------------------------------------

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    // Ampersand last, so "&amp;lt;" does not become "<".
    .replace(/&amp;/g, '&')
}

/** Decodes the \uXXXX escapes that appear in the watch page's inline JSON. */
function decodeJsonEscapes(text) {
  return text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchText(url, headers) {
  const response = await fetch(url, {headers})
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.slice(0, 80)}`)
  return response.text()
}

// --- Chapters ---------------------------------------------------------------

/**
 * Extracts the table of contents from the watch page.
 *
 * Chapters live in `macroMarkersListItemRenderer` entries in the page's inline
 * JSON. Roughly 3 in 4 videos in this dataset have them; the rest legitimately
 * return an empty array. Labels are never synthesized — AGENTS.md §7 makes the
 * transcript the fallback precisely so that chapter labels stay clean and
 * authored (§8).
 */
async function fetchChapters(videoId) {
  const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}`, {
    'user-agent': BROWSER_UA,
    'accept-language': 'en-US,en',
  })

  const matches = html.matchAll(
    /"macroMarkersListItemRenderer":\{.*?"title":\{"simpleText":"(.*?)"\}.*?"startTimeSeconds":(\d+)/g,
  )

  // The renderer appears more than once per chapter in the page payload, so
  // dedupe on the start second and keep the first label seen.
  const byStart = new Map()
  for (const match of matches) {
    const startSeconds = Number(match[2])
    if (byStart.has(startSeconds)) continue

    const label = decodeEntities(decodeJsonEscapes(match[1])).trim()
    if (label) byStart.set(startSeconds, label)
  }

  return [...byStart.entries()]
    .map(([startSeconds, label]) => ({
      _type: 'chapter',
      _key: `ch-${startSeconds}`,
      startSeconds,
      label,
    }))
    .sort((a, b) => a.startSeconds - b.startSeconds)
}

// --- Transcript -------------------------------------------------------------

/** Asks the InnerTube player endpoint for the video's caption tracks. */
async function fetchPlayerResponse(videoId) {
  const response = await fetch(INNERTUBE_URL, {
    method: 'POST',
    headers: {'content-type': 'application/json', 'user-agent': INNERTUBE_UA},
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '20.10.38',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US',
        },
      },
      videoId,
    }),
  })

  if (!response.ok) throw new Error(`InnerTube HTTP ${response.status}`)
  return response.json()
}

/** Prefers a human-authored English track; falls back to auto-captions, which
 *  is all most of these videos have. */
function pickCaptionTrack(tracks) {
  if (!tracks?.length) return null

  const english = tracks.filter((track) => (track.languageCode ?? '').startsWith('en'))
  const pool = english.length ? english : tracks

  return pool.find((track) => track.kind !== 'asr') ?? pool[0]
}

/** Parses srv3 timedtext into `{startSeconds, text}` cues. */
function parseSrv3(xml) {
  const cues = []

  for (const match of xml.matchAll(/<p\s+t="(\d+)"[^>]*>(.*?)<\/p>/gs)) {
    const text = decodeEntities(match[2].replace(/<[^>]+>/g, ''))
      .replace(/\s+/g, ' ')
      .trim()
    if (!text) continue

    cues.push({startSeconds: Math.floor(Number(match[1]) / 1000), text})
  }

  return cues
}

/**
 * Merges raw cues into search-sized chunks.
 *
 * Each chunk keeps the start second of its *first* cue, so seeking to a chunk
 * still lands on the moment the text begins rather than somewhere in the middle
 * of it. A chunk closes once it reaches either the time or the character
 * target, which keeps chunks useful for matching without letting a fast talker
 * produce a wall of text.
 */
function toChunk({startSeconds, parts}) {
  return {
    _type: 'chunk',
    // Derived from the start second rather than random, so a re-ingest of the
    // same video produces identical keys instead of churning the array.
    _key: `c-${startSeconds}`,
    startSeconds,
    text: parts.join(' '),
  }
}

function buildChunks(cues) {
  const chunks = []
  let current = null

  for (const cue of cues) {
    if (!current) {
      current = {startSeconds: cue.startSeconds, parts: [cue.text]}
      continue
    }

    const elapsed = cue.startSeconds - current.startSeconds
    const length = current.parts.join(' ').length

    if (elapsed >= CHUNK_TARGET_SECONDS || length >= CHUNK_TARGET_CHARS) {
      chunks.push(toChunk(current))
      current = {startSeconds: cue.startSeconds, parts: [cue.text]}
    } else {
      current.parts.push(cue.text)
    }
  }

  if (current) {
    chunks.push(toChunk(current))
  }

  return chunks
}

async function fetchTranscript(videoId) {
  const player = await fetchPlayerResponse(videoId)

  const status = player.playabilityStatus?.status
  if (status && status !== 'OK') throw new Error(`not playable: ${status}`)

  const track = pickCaptionTrack(player.captions?.playerCaptionsTracklistRenderer?.captionTracks)
  if (!track?.baseUrl) return {chunks: [], duration: null, title: null}

  const xml = await fetchText(`${track.baseUrl}&fmt=srv3`, {'user-agent': BROWSER_UA})

  return {
    chunks: buildChunks(parseSrv3(xml)),
    duration: Number(player.videoDetails?.lengthSeconds) || null,
    title: player.videoDetails?.title ?? null,
  }
}

// --- Ingestion --------------------------------------------------------------

async function ingestVideo(video) {
  const {videoId, url} = video

  // Chapters are best-effort: a video legitimately may not have them, and a
  // parse failure must not cost us the transcript.
  let chapters = []
  try {
    chapters = await fetchChapters(videoId)
  } catch (error) {
    console.warn(`  ! chapters failed for ${videoId}: ${error.message}`)
  }

  await sleep(REQUEST_DELAY_MS)

  const {chunks, duration, title} = await fetchTranscript(videoId)
  if (chunks.length === 0) throw new Error('no transcript chunks')

  // Keys are derived from the start second, so a collision would mean two
  // chunks claiming the same moment. Sanity silently misbehaves on duplicate
  // keys, so fail loudly here instead.
  const keys = new Set(chunks.map((chunk) => chunk._key))
  if (keys.size !== chunks.length) throw new Error('duplicate chunk keys')

  return {
    _id: toDocumentId(videoId),
    _type: 'video',
    videoId,
    url,
    provider: 'youtube',
    title: title ?? video.title ?? null,
    duration: duration ?? null,
    chapters,
    chunks,
  }
}

/** Runs `worker` over `items` with a bounded number in flight. */
async function mapWithConcurrency(items, workerCount, worker) {
  const queue = [...items.entries()]
  const workers = Array.from({length: Math.min(workerCount, queue.length)}, async () => {
    for (;;) {
      const next = queue.shift()
      if (!next) return
      await worker(next[1], next[0])
    }
  })

  await Promise.all(workers)
}

async function main() {
  const projectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const apiVersion = env.NEXT_PUBLIC_SANITY_API_VERSION || '2026-08-27'
  const readToken = env.SANITY_API_READ_TOKEN
  const writeToken = env.SANITY_API_WRITE_TOKEN

  if (!projectId) throw new Error('NEXT_PUBLIC_SANITY_PROJECT_ID is not set')
  if (!readToken) throw new Error('SANITY_API_READ_TOKEN is not set')
  if (!dryRun && !writeToken) {
    throw new Error(
      'SANITY_API_WRITE_TOKEN is not set. Create an Editor token at manage.sanity.io ' +
        'and add it to .env.local, or re-run with --dry-run.',
    )
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    token: writeToken || readToken,
    useCdn: false,
  })

  // The dataset is the source of truth for which videos exist, not videos.json.
  const lessons = await client.fetch(
    '*[_type == "lesson" && defined(videoUrl)]{_id, title, videoUrl}',
  )
  console.log(`Found ${lessons.length} lessons with a videoUrl.`)

  // One document per unique video URL (§8), so two lessons sharing a video
  // ingest it once.
  const byVideoId = new Map()
  const skipped = []

  for (const lesson of lessons) {
    const videoId = parseYouTubeId(lesson.videoUrl)
    if (!videoId) {
      // AGENTS.md §9: a provider is not supported until both ingestion and
      // playback exist. Only YouTube has both today.
      skipped.push({lesson: lesson._id, url: lesson.videoUrl})
      continue
    }
    if (!byVideoId.has(videoId)) {
      byVideoId.set(videoId, {videoId, url: lesson.videoUrl, title: lesson.title})
    }
  }

  const videos = [...byVideoId.values()].slice(0, limit)
  console.log(
    `${byVideoId.size} unique videos, ingesting ${videos.length}` +
      `${dryRun ? ' (dry run — nothing will be written)' : ''}.\n`,
  )

  const stats = {ingested: 0, failed: 0, withoutChapters: 0}
  const failures = []

  await mapWithConcurrency(videos, concurrency, async (video, index) => {
    const position = `[${index + 1}/${videos.length}]`

    try {
      const doc = await ingestVideo(video)
      if (doc.chapters.length === 0) stats.withoutChapters += 1

      if (!dryRun) await client.createOrReplace(doc)

      stats.ingested += 1
      console.log(
        `${position} ${doc.videoId}  ${String(doc.chapters.length).padStart(2)} chapters  ` +
          `${String(doc.chunks.length).padStart(3)} chunks  ${(doc.title ?? '').slice(0, 48)}`,
      )
    } catch (error) {
      // One bad video must not abort the other 119.
      stats.failed += 1
      failures.push({videoId: video.videoId, message: error.message})
      console.error(`${position} ${video.videoId}  FAILED: ${error.message}`)
    }
  })

  console.log('\n--- Summary ---')
  console.log(`Ingested:            ${stats.ingested}`)
  console.log(`Without chapters:    ${stats.withoutChapters}`)
  console.log(`Failed:              ${stats.failed}`)
  console.log(`Skipped (unsupported provider): ${skipped.length}`)

  for (const skip of skipped) console.log(`  - ${skip.lesson}: ${skip.url}`)
  for (const failure of failures) console.log(`  ! ${failure.videoId}: ${failure.message}`)

  if (dryRun) console.log('\nDry run: no documents were written.')

  process.exitCode = stats.failed > 0 ? 1 : 0
}

main().catch((error) => {
  console.error(`\nIngestion aborted: ${error.message}`)
  process.exit(1)
})
