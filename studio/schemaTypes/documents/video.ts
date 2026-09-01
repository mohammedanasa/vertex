import {DocumentVideoIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Video intelligence for a single unique video (AGENTS.md §8).
 *
 * Built by the offline ingestion pipeline (`scripts/ingest-videos.mjs`), one
 * document per unique video URL. Lessons link to it by video URL rather than by
 * reference, so the same video ingested once serves every lesson that uses it.
 *
 * This is an internal lookup for resolving a search hit to a timestamp. It is
 * never surfaced to a learner as a result on its own (§7).
 *
 * The transcript lives only as `chunks` — many short timestamped pieces. There
 * is deliberately no field holding the whole transcript, because a query that
 * returned one would overflow the model's context window (§12).
 */
export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  icon: DocumentVideoIcon,
  // Pipeline-built. Hand edits would be overwritten on the next ingest run.
  readOnly: true,
  fields: [
    defineField({
      name: 'videoId',
      title: 'Video ID',
      type: 'string',
      description: "The provider's own id, e.g. 9602Yzvd7ik.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      description: 'The canonical watch URL this document was built from.',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'provider',
      type: 'string',
      options: {
        list: [
          {title: 'YouTube', value: 'youtube'},
          {title: 'Vimeo', value: 'vimeo'},
          {title: 'Bunny', value: 'bunny'},
        ],
      },
      initialValue: 'youtube',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      description: "The source's own title. For legibility in the Studio.",
    }),
    defineField({
      name: 'duration',
      type: 'number',
      description: 'Duration in seconds.',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'chapters',
      title: 'Chapters',
      description:
        'The table of contents, matched first when resolving a timestamp. Empty when the source has no chapter markers — labels are never synthesized.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'chapter',
          fields: [
            defineField({
              name: 'startSeconds',
              title: 'Start (seconds)',
              type: 'number',
              validation: (rule) => rule.required().min(0).integer(),
            }),
            defineField({
              name: 'label',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'startSeconds'},
          },
        }),
      ],
    }),
    defineField({
      name: 'chunks',
      title: 'Transcript Chunks',
      description:
        'The transcript in short timestamped pieces, used as the fallback when no chapter matches.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'chunk',
          fields: [
            defineField({
              name: 'startSeconds',
              title: 'Start (seconds)',
              type: 'number',
              validation: (rule) => rule.required().min(0).integer(),
            }),
            defineField({
              name: 'text',
              type: 'text',
              rows: 3,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: {
            select: {title: 'text', subtitle: 'startSeconds'},
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      videoId: 'videoId',
      chapters: 'chapters',
      chunks: 'chunks',
    },
    prepare({title, videoId, chapters, chunks}) {
      const chapterCount = chapters?.length ?? 0
      const chunkCount = chunks?.length ?? 0
      return {
        title: title || videoId,
        subtitle: `${chapterCount} chapters · ${chunkCount} chunks`,
      }
    },
  },
})
