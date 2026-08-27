import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

import {schema} from './schemaTypes'
import {structure} from './structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!projectId) throw new Error('Missing environment variable: SANITY_STUDIO_PROJECT_ID')
if (!dataset) throw new Error('Missing environment variable: SANITY_STUDIO_DATASET')

export default defineConfig({
  name: 'vertex',
  title: 'Vertex',
  projectId,
  dataset,
  schema,
  plugins: [structureTool({structure}), visionTool()],
})
