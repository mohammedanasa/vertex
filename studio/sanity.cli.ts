import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

export default defineCliConfig({
  api: {projectId, dataset},
  deployment: {
    appId: 'x4a6ygq412scev34e75au6xl',
  },
  typegen: {
    enabled: true,
    path: ['../app/**/*.{ts,tsx}', '../sanity/**/*.{ts,tsx}', '../lib/**/*.{ts,tsx}', '../components/**/*.{ts,tsx}'],
    schema: 'schema.json',
    generates: '../sanity.types.ts',
    overloadClientMethods: true,
  },
})
