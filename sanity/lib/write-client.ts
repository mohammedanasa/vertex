import 'server-only'

import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from './env'

/**
 * The write client, used only by the progress route (`app/api/progress/route.ts`).
 *
 * Deliberately separate from `./client.ts` so the read path cannot accidentally
 * gain write capability: a module that only renders content imports the read
 * client and gets no token that could mutate the dataset.
 *
 * `useCdn: false` because a write must act on current data, not a cached copy,
 * and because the read-after-write in the upsert has to see its own writes.
 *
 * The token is asserted here rather than in `./env.ts` on purpose. `env.ts` is
 * imported by every page that reads content; asserting the write token there
 * would take the whole site down when only the write path is misconfigured.
 */
function writeToken(): string {
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) {
    throw new Error(
      'Missing environment variable: SANITY_API_WRITE_TOKEN. ' +
        'Create an Editor token at manage.sanity.io. Server-only — never expose it to the browser.',
    )
  }
  return token
}

export function getWriteClient() {
  return createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token: writeToken(),
    perspective: 'published',
  })
}
