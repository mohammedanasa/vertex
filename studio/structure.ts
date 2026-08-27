import {DocumentTextIcon, PlayIcon, TagIcon, UserIcon} from '@sanity/icons'
import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.documentTypeListItem('course').title('Courses').icon(DocumentTextIcon),
      S.documentTypeListItem('lesson').title('Lessons').icon(PlayIcon),
      S.documentTypeListItem('instructor').title('Instructors').icon(UserIcon),
      S.documentTypeListItem('category').title('Categories').icon(TagIcon),
    ])
