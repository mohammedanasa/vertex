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
      lessons[]->{ _id, title, "slug": slug.current, duration, freePreview, poster },
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
    poster,
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
      modules[]{
        _key,
        title,
        lessons[]->{ _id, title, "slug": slug.current, duration },
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
