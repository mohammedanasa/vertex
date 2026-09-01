import { defineQuery } from 'next-sanity'

const courseCardProjection = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  summary,
  coverImage,
  level,
  price,
  popular,
  studentCount,
  "moduleCount": count(modules),
  "lessonCount": count(modules[].lessons[]),
  "lessonSlugs": modules[].lessons[]->slug.current,
  "lessonIds": modules[].lessons[]->_id,
  "totalDuration": math::sum(modules[].lessons[]->duration),
  "instructor": instructor->{ name, "slug": slug.current, photo },
  "category": category->{ title, "slug": slug.current },
}`

export const COURSES_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)] | order(_createdAt desc) ${courseCardProjection}
`)

export const COURSE_BY_SLUG_QUERY = defineQuery(`
  *[_type == "course" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    summary,
    coverImage,
    level,
    price,
    popular,
    studentCount,
    learningOutcomes[]{ _key, icon, title, description },
    instructor->{ _id, name, "slug": slug.current, photo, expertise, bio },
    category->{ _id, title, "slug": slug.current, description },
    modules[]{
      _key,
      title,
      summary,
      lessons[]->{ _id, title, "slug": slug.current, duration, freePreview, thumbnail },
    },
  }
`)

export const COURSE_SLUGS_QUERY = defineQuery(`
  *[_type == "course" && defined(slug.current)]{ "slug": slug.current }
`)

export const LESSON_BY_SLUG_QUERY = defineQuery(`
  *[_type == "lesson" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    videoUrl,
    thumbnail,
    duration,
    freePreview,
    studentCount,
    keyPoints,
    notes,
    proTip,
    resources[]{ _key, type, title, description, url },
    "course": *[_type == "course" && references(^._id)][0]{
      _id,
      title,
      "slug": slug.current,
      summary,
      coverImage,
      level,
      modules[]{
        _key,
        title,
        summary,
        lessons[]->{
          _id,
          title,
          "slug": slug.current,
          duration,
          freePreview,
          thumbnail,
        },
      },
    },
  }
`)

export const LESSON_SLUGS_QUERY = defineQuery(`
  *[_type == "lesson" && defined(slug.current)]{ "slug": slug.current }
`)

export const INSTRUCTOR_BY_SLUG_QUERY = defineQuery(`
  *[_type == "instructor" && slug.current == $slug][0]{
    _id,
    name,
    "slug": slug.current,
    photo,
    expertise,
    bio,
    "courses": *[_type == "course" && references(^._id) && defined(slug.current)]${courseCardProjection},
  }
`)

export const INSTRUCTOR_SLUGS_QUERY = defineQuery(`
  *[_type == "instructor" && defined(slug.current)]{ "slug": slug.current }
`)

export const CATEGORIES_QUERY = defineQuery(`
  *[_type == "category"] | order(title asc){
    _id,
    title,
    "slug": slug.current,
    description,
  }
`)

/**
 * Re-fetches the lessons a search returned, by id.
 *
 * This is the grounding step: the language model supplies only ids, and every
 * value the search page renders comes from here (AGENTS.md §11). An id the
 * model invented matches no document and simply drops out of the results.
 *
 * `moduleTitles` and `moduleLessonSlugs` are returned so the caller can derive
 * the "Lesson 5.1" label from array position. GROQ exposes module order but not
 * an index, and having the model count positions is exactly how fabricated
 * lesson numbers appear — so the arithmetic happens in TypeScript instead,
 * using the same rule as `getLessonBySlug`.
 */
export const SEARCH_HYDRATE_QUERY = defineQuery(`
  *[_type == "lesson" && _id in $ids]{
    _id,
    title,
    "slug": slug.current,
    duration,
    thumbnail,
    keyPoints,
    "notesText": pt::text(notes),
    "course": *[_type == "course" && references(^._id)][0]{
      title,
      "slug": slug.current,
      coverImage,
      "moduleTitles": modules[].title,
      "moduleTitle": modules[lessons[]._ref match ^.^._id][0].title,
      "moduleLessonSlugs": modules[lessons[]._ref match ^.^._id][0].lessons[]->slug.current,
    },
  }
`)

/**
 * Finds lessons matching a set of keyword stems.
 *
 * The stems come from the model; the query itself is fixed here. That keeps the
 * model out of GROQ authoring entirely — it cannot emit a malformed query, and
 * `$stems` is a bound parameter, so its text can never alter the query.
 *
 * `match` semantics matter: a *parameterized array* is AND (every term must
 * match), while an inline array literal is OR. Verified against the dataset —
 * `title match $stems` with four stems returned 1 lesson, while the OR form
 * below returned 40. So the OR is written explicitly, by counting how many
 * stems each field matches and keeping any lesson with at least one hit.
 *
 * The per-field hit counts double as the ranking signal: a stem in the title is
 * more specific than one buried in the notes (AGENTS.md §11).
 */
export const LESSON_SEARCH_QUERY = defineQuery(`
  *[_type == "lesson" && count($stems[
    ^.title match @ || pt::text(^.notes) match @ || ^.keyPoints[] match @
  ]) > 0]{
    _id,
    title,
    "titleHits": count($stems[^.title match @]),
    "keyPointHits": count($stems[^.keyPoints[] match @]),
    "notesHits": count($stems[pt::text(^.notes) match @]),
  } | order(titleHits desc, keyPointHits desc, notesHits desc)[0...$limit]
`)

/**
 * Resolves the ranked lessons to specific matched moments in their videos.
 *
 * This is the server side of AGENTS.md §7's two-stage timestamp resolution.
 * Both stages are fetched here and the choice between them is made in
 * `lib/search/hydrate.ts`: chapter labels are authored and clean, so they win;
 * the transcript is the noisier fallback used only when no chapter matches.
 *
 * The lesson -> video join goes through `videoUrl`, not a reference (§8), so a
 * video ingested once serves every lesson that embeds it. `[defined(video)]`
 * drops a lesson whose video was never ingested, and because the traversal
 * starts from the lesson, a `video` document can never surface on its own (§7).
 *
 * `match` semantics are the trap here. A *parameterized* array is AND (every
 * stem must match), so the OR is written by counting stem hits. The operand
 * order is load-bearing and easy to reverse:
 *
 *     chapters[count($stems[@ match ^.label]) > 0]   // wrong: silently []
 *     chapters[count($stems[^.label match @]) > 0]   // right
 *
 * Both forms parse and neither errors, so getting it backwards degrades search
 * to lesson-only results with no signal that anything broke. Verified against
 * the dataset: stems ["data*","fetch*","cach*"] match 15 videos on chapter
 * label and 93 on transcript text.
 *
 * `$perVideo` caps the moments taken from each video so one heavily-matching
 * video cannot crowd out the page, and so a whole `chunks` array is never
 * pulled into memory (§12).
 */
export const VIDEO_MOMENTS_QUERY = defineQuery(`
  *[_type == "lesson" && _id in $ids && defined(videoUrl)]{
    _id,
    "video": *[_type == "video" && url == ^.videoUrl][0]{
      "chapterMoments": chapters[count($stems[^.label match @]) > 0][0...$perVideo]{
        startSeconds,
        label,
      },
      "chunkMoments": chunks[count($stems[^.text match @]) > 0][0...$perVideo]{
        startSeconds,
        text,
      },
    },
  }[defined(video)]
`)

/**
 * A learner's progress record, looked up by their Clerk user id.
 *
 * `order(_createdAt asc)[0]` rather than a bare `[0]`: the schema enforces one
 * document per user, but if a duplicate ever slipped in, an unordered `[0]`
 * would return an arbitrary one and a learner's progress would appear to flip
 * between reads. Oldest-wins is at least stable.
 */
export const PROGRESS_BY_USER_QUERY = defineQuery(`
  *[_type == "progress" && userId == $userId] | order(_createdAt asc)[0]{
    _id,
    _rev,
    userId,
    completedLessons,
    lastPositions[]{ lessonId, seconds },
    enrolledCourses,
    removedCourses,
  }
`)

/**
 * The lesson ids belonging to one course. Used by the reset action to scope a
 * wipe to that course — the client never supplies the lesson list.
 */
export const COURSE_LESSON_IDS_QUERY = defineQuery(`
  *[_type == "course" && _id == $courseId][0]{
    "lessonIds": modules[].lessons[]->_id,
  }
`)
