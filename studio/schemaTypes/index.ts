import {type SchemaTypeDefinition} from 'sanity'

import {category} from './documents/category'
import {course} from './documents/course'
import {instructor} from './documents/instructor'
import {lesson} from './documents/lesson'
import {learningOutcome} from './objects/learningOutcome'
import {module_} from './objects/module'
import {resource} from './objects/resource'

export const schema: {types: SchemaTypeDefinition[]} = {
  types: [course, lesson, instructor, category, module_, learningOutcome, resource],
}
