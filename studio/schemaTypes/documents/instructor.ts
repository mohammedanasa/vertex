import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const instructor = defineType({
  name: 'instructor',
  title: 'Instructor',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'name'},
      validation: (rule) =>
        rule.required().custom(async (slug, context) => {
          if (!slug?.current) return true
          const client = context.getClient({apiVersion: '2026-08-27'})
          const id = context.document?._id?.replace(/^drafts\./, '')
          const existing = await client.fetch(
            `count(*[_type == "instructor" && slug.current == $slug && _id != $id])`,
            {slug: slug.current, id},
          )
          return existing === 0 || 'An instructor with this slug already exists'
        }),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'expertise',
      type: 'array',
      of: [{type: 'string'}],
    }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 4,
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'expertise', media: 'photo'},
    prepare({title, subtitle, media}) {
      return {
        title,
        subtitle: Array.isArray(subtitle) ? subtitle.join(', ') : subtitle,
        media,
      }
    },
  },
})
