import {CheckmarkCircleIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

export const learningOutcome = defineType({
  name: 'learningOutcome',
  title: 'Learning Outcome',
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    defineField({
      name: 'icon',
      title: 'Icon',
      type: 'string',
      description: 'Icon identifier used by the frontend to render this outcome.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'title', subtitle: 'description'},
  },
})
