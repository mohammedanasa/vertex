import {TagIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  icon: TagIcon,
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
            `count(*[_type == "category" && slug.current == $slug && _id != $id])`,
            {slug: slug.current, id},
          )
          return existing === 0 || 'A category with this slug already exists'
        }),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
  },
})
