import 'server-only'

import { client } from './client'
import { token } from './env'
import { sanityFetch } from './live'
import {
  BOOKMARKED_ITEMS_QUERY,
  CATEGORIES_QUERY,
  COURSE_BY_SLUG_QUERY,
  COURSE_LESSON_IDS_QUERY,
  COURSE_SLUGS_QUERY,
  COURSES_QUERY,
  INSTRUCTOR_BY_SLUG_QUERY,
  INSTRUCTOR_SLUGS_QUERY,
  LESSON_BY_SLUG_QUERY,
  LESSON_SEARCH_QUERY,
  LESSON_SLUGS_QUERY,
  PROGRESS_BY_USER_QUERY,
  SEARCH_HYDRATE_QUERY,
  VIDEO_MOMENTS_QUERY,
} from './queries'

/**
 * The dataset is private (AGENTS.md section 12), and `sanityFetch` (from
 * `defineLive`) only attaches `serverToken` when `perspective` is explicitly
 * non-'published' (see next-sanity's live/conditions/next-js implementation).
 * Every call here passes `perspective: 'drafts'` so the token is actually
 * sent — this dataset has no draft documents, so the query still resolves to
 * published content, it just now authenticates the request.
 */
export async function getCourses() {
  const { data } = await sanityFetch({ query: COURSES_QUERY, perspective: 'drafts', stega: false })
  return data
}

export async function getCourseBySlug(slug: string) {
  const { data } = await sanityFetch({
    query: COURSE_BY_SLUG_QUERY,
    params: { slug },
    perspective: 'drafts',
    stega: false,
  })
  return data
}

export async function getCourseSlugs() {
  const { data } = await sanityFetch({ query: COURSE_SLUGS_QUERY, perspective: 'drafts', stega: false })
  return data
}

/**
 * A lesson does not store its parent course (AGENTS.md section 8), so the
 * course/module/lesson position is derived here from the reverse-referenced
 * course's module array order, not from stored numbering. The same pass builds
 * the sidebar's module list and the flat previous/next neighbours, which cross
 * module boundaries (the last lesson of module 4 precedes the first of module 5).
 */
export async function getLessonBySlug(slug: string) {
  const { data: lesson } = await sanityFetch({
    query: LESSON_BY_SLUG_QUERY,
    params: { slug },
    perspective: 'drafts',
    stega: false,
  })
  if (!lesson) return null

  const { course, ...rest } = lesson
  if (!course) return { ...rest, course: null }

  const modules = (course.modules ?? []).map((mod, moduleIndex) => {
    const lessons = (mod.lessons ?? []).flatMap((l, lessonIndex) =>
      l
        ? [
            {
              _id: l._id,
              title: l.title,
              slug: l.slug,
              duration: l.duration,
              freePreview: l.freePreview,
              number: `${moduleIndex + 1}.${lessonIndex + 1}`,
              isCurrent: l._id === lesson._id,
            },
          ]
        : [],
    )

    return {
      _key: mod._key,
      title: mod.title,
      summary: mod.summary,
      number: moduleIndex + 1,
      durationSeconds: lessons.reduce((sum, l) => sum + (l.duration ?? 0), 0),
      lessons,
    }
  })

  const currentModule = modules.find((mod) =>
    mod.lessons.some((l) => l.isCurrent),
  )
  const currentLesson = currentModule?.lessons.find((l) => l.isCurrent)

  // Flatten so previous/next walk the whole course, not just one module.
  const flatLessons = modules.flatMap((mod) => mod.lessons)
  const currentIndex = flatLessons.findIndex((l) => l.isCurrent)

  return {
    ...rest,
    course: {
      _id: course._id,
      title: course.title,
      slug: course.slug,
      summary: course.summary,
      coverImage: course.coverImage,
      level: course.level,
      moduleTitle: currentModule?.title ?? null,
      moduleSummary: currentModule?.summary ?? null,
      moduleNumber: currentModule?.number ?? null,
      moduleCount: modules.length,
      lessonNumber: currentLesson
        ? Number(currentLesson.number.split('.')[1])
        : null,
      lessonLabel: currentLesson?.number ?? null,
      label: currentModule
        ? `Lesson ${currentLesson?.number} in ${currentModule.title}`
        : null,
      modules,
      previousLesson: currentIndex > 0 ? flatLessons[currentIndex - 1] : null,
      nextLesson:
        currentIndex !== -1 && currentIndex < flatLessons.length - 1
          ? flatLessons[currentIndex + 1]
          : null,
    },
  }
}

export async function getLessonSlugs() {
  const { data } = await sanityFetch({ query: LESSON_SLUGS_QUERY, perspective: 'drafts', stega: false })
  return data
}

export async function getInstructorBySlug(slug: string) {
  const { data } = await sanityFetch({
    query: INSTRUCTOR_BY_SLUG_QUERY,
    params: { slug },
    perspective: 'drafts',
    stega: false,
  })
  return data
}

export async function getInstructorSlugs() {
  const { data } = await sanityFetch({ query: INSTRUCTOR_SLUGS_QUERY, perspective: 'drafts', stega: false })
  return data
}

export async function getCategories() {
  const { data } = await sanityFetch({ query: CATEGORIES_QUERY, perspective: 'drafts', stega: false })
  return data
}

/**
 * Fetches the lessons behind a set of search-result ids.
 *
 * Ids are passed as a GROQ parameter, never interpolated into the query string,
 * so model-supplied text cannot alter the query.
 */
export async function getLessonsForSearch(ids: string[]) {
  if (ids.length === 0) return []

  const { data } = await sanityFetch({
    query: SEARCH_HYDRATE_QUERY,
    params: { ids },
    perspective: 'drafts',
    stega: false,
  })
  return data
}

/**
 * Runs the keyword search over lessons. `stems` are wildcarded tokens supplied
 * by the search agent; they are bound as a GROQ parameter, never interpolated.
 */
export async function searchLessonsByStems(stems: string[], limit: number) {
  if (stems.length === 0) return []

  const { data } = await sanityFetch({
    query: LESSON_SEARCH_QUERY,
    params: { stems, limit },
    perspective: 'drafts',
    stega: false,
  })
  return data
}

/**
 * Resolves ranked lessons to matched moments in their videos (AGENTS.md §7).
 *
 * `stems` are the same wildcarded tokens used for the lesson search, bound as a
 * GROQ parameter rather than interpolated. `perVideo` bounds how much of each
 * video's `chunks` array can come back, so a transcript is never fetched whole
 * (§12).
 */
export async function getVideoMoments(
  ids: string[],
  stems: string[],
  perVideo: number,
) {
  if (ids.length === 0 || stems.length === 0) return []

  const { data } = await sanityFetch({
    query: VIDEO_MOMENTS_QUERY,
    params: { ids, stems, perVideo },
    perspective: 'drafts',
    stega: false,
  })
  return data
}

/**
 * Fetches one learner's progress record, or null if they have none yet.
 *
 * Deliberately **not** routed through `sanityFetch`. That path is built for
 * cacheable catalog content; progress is per-user state that changes as a
 * direct result of the learner's own action, and serving a cached copy would
 * show a course still present right after they removed it. This uses the raw
 * client with the read token, `useCdn: false`, and no caching.
 *
 * `userId` is bound as a GROQ parameter, never interpolated.
 */
export async function getProgressRecord(userId: string) {
  return client
    .withConfig({ useCdn: false, token, perspective: 'published' })
    .fetch(PROGRESS_BY_USER_QUERY, { userId }, { cache: 'no-store' })
}

/**
 * The lesson ids belonging to one course.
 *
 * Used by the reset action to scope a wipe to that course's lessons, resolved
 * server-side so a client cannot supply the list and wipe lessons it does not
 * own.
 */
export async function getCourseLessonIds(courseId: string): Promise<string[]> {
  const result = await client
    .withConfig({ useCdn: false, token, perspective: 'published' })
    .fetch(COURSE_LESSON_IDS_QUERY, { courseId }, { cache: 'no-store' })

  return (result?.lessonIds ?? []).filter((id): id is string => Boolean(id))
}

/**
 * Resolves a learner's bookmarked ids into the cards the Saved page renders.
 *
 * Like `getProgressRecord`, this is per-learner state and is not routed through
 * `sanityFetch`: a cached copy would show an item the learner just removed.
 *
 * Ids are bound as GROQ parameters, never interpolated. Empty input short
 * circuits so the common "nothing saved yet" case costs no round trip.
 */
export async function getBookmarkedItems(
  courseIds: readonly string[],
  lessonIds: readonly string[],
) {
  if (courseIds.length === 0 && lessonIds.length === 0) {
    return { courses: [], lessons: [] }
  }

  const data = await client
    .withConfig({ useCdn: false, token, perspective: 'published' })
    .fetch(
      BOOKMARKED_ITEMS_QUERY,
      { courseIds: [...courseIds], lessonIds: [...lessonIds] },
      { cache: 'no-store' },
    )

  return { courses: data?.courses ?? [], lessons: data?.lessons ?? [] }
}
