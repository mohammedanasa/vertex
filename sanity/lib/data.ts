import 'server-only'

import { sanityFetch } from './live'
import {
  CATEGORIES_QUERY,
  COURSE_BY_SLUG_QUERY,
  COURSE_SLUGS_QUERY,
  COURSES_QUERY,
  INSTRUCTOR_BY_SLUG_QUERY,
  INSTRUCTOR_SLUGS_QUERY,
  LESSON_BY_SLUG_QUERY,
  LESSON_SLUGS_QUERY,
} from './queries'

export async function getCourses() {
  const { data } = await sanityFetch({ query: COURSES_QUERY })
  return data
}

export async function getCourseBySlug(slug: string) {
  const { data } = await sanityFetch({ query: COURSE_BY_SLUG_QUERY, params: { slug } })
  return data
}

export async function getCourseSlugs() {
  const { data } = await sanityFetch({ query: COURSE_SLUGS_QUERY, perspective: 'published', stega: false })
  return data
}

/**
 * A lesson does not store its parent course (AGENTS.md section 8), so the
 * course/module/lesson position is derived here from the reverse-referenced
 * course's module array order, not from stored numbering.
 */
export async function getLessonBySlug(slug: string) {
  const { data: lesson } = await sanityFetch({ query: LESSON_BY_SLUG_QUERY, params: { slug } })
  if (!lesson) return null

  const { course, ...rest } = lesson
  if (!course) return { ...rest, course: null }

  let moduleIndex = -1
  let lessonIndex = -1
  let moduleTitle: string | null = null

  course.modules?.forEach((mod, mIndex) => {
    const lIndex = mod.lessons?.findIndex((l) => l?._id === lesson._id) ?? -1
    if (lIndex !== -1) {
      moduleIndex = mIndex
      lessonIndex = lIndex
      moduleTitle = mod.title
    }
  })

  return {
    ...rest,
    course: {
      _id: course._id,
      title: course.title,
      slug: course.slug,
      moduleTitle,
      moduleNumber: moduleIndex === -1 ? null : moduleIndex + 1,
      lessonNumber: lessonIndex === -1 ? null : lessonIndex + 1,
      label:
        moduleIndex === -1
          ? null
          : `Lesson ${moduleIndex + 1}.${lessonIndex + 1} in ${moduleTitle}`,
    },
  }
}

export async function getLessonSlugs() {
  const { data } = await sanityFetch({ query: LESSON_SLUGS_QUERY, perspective: 'published', stega: false })
  return data
}

export async function getInstructorBySlug(slug: string) {
  const { data } = await sanityFetch({ query: INSTRUCTOR_BY_SLUG_QUERY, params: { slug } })
  return data
}

export async function getInstructorSlugs() {
  const { data } = await sanityFetch({ query: INSTRUCTOR_SLUGS_QUERY, perspective: 'published', stega: false })
  return data
}

export async function getCategories() {
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY })
  return data
}
