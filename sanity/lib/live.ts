import 'server-only'

// Querying with "sanityFetch" will keep content automatically updated
// Before using it, import and render "<SanityLive />" in your layout, see
// https://github.com/sanity-io/next-sanity#live-content-api for more information.
import { defineLive } from 'next-sanity/live'

import { client } from './client'
import { token } from './env'

// The dataset is private, so a read token is required. It is passed as the
// server token only — the browser never receives a Sanity token, per
// AGENTS.md's server/client boundary for the read-only Sanity client.
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: false,
})
