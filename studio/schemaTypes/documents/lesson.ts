import {PlayIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
  type: 'document',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title'},
      validation: (rule) =>
        rule.required().custom(async (slug, context) => {
          if (!slug?.current) return true
          const client = context.getClient({apiVersion: '2026-08-27'})
          const id = context.document?._id?.replace(/^drafts\./, '')
          const existing = await client.fetch(
            `count(*[_type == "lesson" && slug.current == $slug && _id != $id])`,
            {slug: slug.current, id},
          )
          return existing === 0 || 'A lesson with this slug already exists'
        }),
    }),
    defineField({
      name: 'videoUrl',
      title: 'Video URL',
      type: 'url',
      description: 'YouTube, Vimeo, or Bunny video URL.',
      validation: (rule) =>
        rule
          .required()
          .uri({scheme: ['http', 'https']})
          .error('Must be a valid URL starting with http:// or https://'),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      options: {hotspot: true},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'duration',
      type: 'number',
      description: 'Duration in seconds.',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'freePreview',
      title: 'Free Preview',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'studentCount',
      title: 'Student Count',
      type: 'number',
      initialValue: 0,
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'keyPoints',
      title: 'Key Points',
      description: 'Shown in the "In this lesson you will" section.',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'notes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading 2', value: 'h2'},
            {title: 'Heading 3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bullet', value: 'bullet'},
            {title: 'Numbered', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    validation: (rule) => rule.uri({scheme: ['http', 'https']}),
                  }),
                ],
              },
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'proTip',
      title: 'Pro Tip',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'resources',
      type: 'array',
      of: [defineArrayMember({type: 'resource'})],
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'duration', media: 'thumbnail'},
  },
})
