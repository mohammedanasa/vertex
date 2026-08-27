# Content model: Studio + schema + server read layer

## Goal

Stand up the Sanity content model for Vertex — `course`, `module` (embedded object), `lesson`, `instructor`, `category` — as a standalone Sanity Studio workspace, and build the web app's server-only read client and data-access helpers on top of it. This is content modeling only: no pages consume this data yet, no video/agent-context/progress schemas (those are separate, later prompts per AGENTS.md section 8).

## Skills read

- `sanity-best-practices` → `references/schema.md`, `references/project-structure.md`, `references/nextjs.md`, `references/typegen.md`
- `content-modeling-best-practices` → `references/reference-vs-embedding.md`

## Code inspected

- `sanity.config.ts`, `sanity.cli.ts`, `sanity/env.ts`, `sanity/lib/{client,image,live}.ts`, `sanity/schemaTypes/index.ts`, `sanity/structure.ts` — currently an **embedded** Studio at `app/studio/[[...tool]]/page.tsx`, empty schema, CDN-only client, no read token, no TypeGen config.
- `.env.local` — has `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, Clerk keys. No `SANITY_API_READ_TOKEN`.
- `package.json` — single workspace, `sanity@5.31.2`, `@sanity/vision@5.31.2`, `next-sanity@13.3.3`, `@sanity/image-url@2.1.1`. No `@sanity/icons` listed as a direct dep but it's present in `node_modules` as a transitive dep (v3.8.0) — must add it as a direct dependency since schema files will import from it.
- `node_modules/@sanity/icons` v3.8.0 only exports its package root (no per-icon subpaths like `@sanity/icons/Tag`), so schema files import icons as named exports from `'@sanity/icons'` directly, not via subpath.
- `app/globals.css`, `lib/utils.ts`, `components/ui/*` — existing web app conventions, untouched by this change.
- No existing GROQ queries or TypeGen output anywhere in the repo.

## Decision: standalone Studio migration (confirmed with user)

AGENTS.md section 5 mandates two standalone workspaces; the current Studio is embedded. Per user confirmation, this prompt migrates it now:

- New `studio/` workspace at repo root: own `package.json`, `sanity.config.ts`, `sanity.cli.ts`, `schemaTypes/`, `structure.ts`.
- Delete `app/studio/[[...tool]]/`, root `sanity.config.ts`, root `sanity.cli.ts`, and the root `sanity/` directory (schema + structure move into `studio/`; the client/image/live helpers move into the web app's own `sanity/lib/` since they're web-only concerns).
- Root `package.json` stays as the web app's `package.json` (this repo's web app already lives at the root, not under `web/`) — no change to its scripts beyond removing `next-sanity/studio` usage. `next-sanity` itself stays (needed for fetching/Live Content).
- `studio/sanity.cli.ts` configures TypeGen to scan `../` (the web app at repo root) and output to `../sanity.types.ts`, with `typegen.enabled: true` for auto-regeneration during `sanity dev`.
- CORS: not actioned here (needs the Sanity dashboard/CLI against the live project) — called out in "Needs your attention."

## Files expected to touch

**New — `studio/` workspace:**
- `studio/package.json` — Sanity Studio deps (`sanity`, `@sanity/vision`, `@sanity/icons`, `styled-components`, `react`, `react-dom`), `dev`/`build`/`deploy`/`start` scripts.
- `studio/sanity.config.ts` — `defineConfig`, `structureTool`, `visionTool`, imports schema + structure.
- `studio/sanity.cli.ts` — `defineCliConfig` with `api.projectId`/`dataset` from env, `typegen` block.
- `studio/tsconfig.json` — standard Sanity Studio TS config.
- `studio/.env.example` and `studio/.env` (gitignored) — `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` (Studio-side env vars use the `SANITY_STUDIO_` prefix, distinct from the web app's `NEXT_PUBLIC_SANITY_*`).
- `studio/schemaTypes/index.ts` — aggregates all types.
- `studio/schemaTypes/documents/course.ts`
- `studio/schemaTypes/documents/lesson.ts`
- `studio/schemaTypes/documents/instructor.ts`
- `studio/schemaTypes/documents/category.ts`
- `studio/schemaTypes/objects/module.ts` — embedded object (per AGENTS.md section 8: "A module is an embedded object inside a course, not its own document")
- `studio/schemaTypes/objects/learningOutcome.ts` — `{ icon, title, description }`
- `studio/schemaTypes/objects/resource.ts` — `{ type, title, description, url }`
- `studio/structure.ts` — custom desk structure grouping Course/Instructor/Category/Lesson.

**Removed:**
- `app/studio/[[...tool]]/page.tsx` and its directory
- `sanity.config.ts`, `sanity.cli.ts` (root)
- `sanity/schemaTypes/`, `sanity/structure.ts`, `sanity/env.ts` (superseded by `studio/` equivalents and `sanity/lib/env.ts` in web)

**Changed/new — web app read layer (root `sanity/lib/`):**
- `sanity/lib/env.ts` — keeps `apiVersion`/`dataset`/`projectId` assertion pattern from the old `sanity/env.ts`, adds `token` (asserted, server-only).
- `sanity/lib/client.ts` — updated: still CDN client for public fetches; unchanged shape otherwise.
- `sanity/lib/live.ts` — updated to pass `serverToken`/`browserToken` per the skill's `defineLive` pattern... **except** per AGENTS.md ("the read token... never expose it to the client, fetch all content server side") the browser must never hold a token. Since the dataset is private and pages are read-only server components for this prompt's scope, `browserToken` is omitted — only `serverToken: process.env.SANITY_API_READ_TOKEN` is set. This means Visual Editing/live client updates in the browser are not wired yet; acceptable since no page consumes this data yet.
- `sanity/lib/queries.ts` — new. `defineQuery` GROQ for: course list (catalog), course detail by slug (with resolved instructor, category, modules→lessons), lesson detail by slug (with reverse-referenced course/module context via `*[references(^._id)]`), instructor by slug, category list.
- `sanity/lib/data.ts` — new. Thin async functions wrapping `sanityFetch` per query (`getCourses()`, `getCourseBySlug(slug)`, `getLessonBySlug(slug)`, `getInstructorBySlug(slug)`, `getCategories()`), each server-only (no `'use client'`), returning typed results via TypeGen once generated.
- `sanity/lib/image.ts` — unchanged, moved as-is (already correct).
- `.env.example` (root, new) — canonical list: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_READ_TOKEN`, existing Clerk vars.
- `.env.local` (root, not committed) — add `SANITY_API_READ_TOKEN=` placeholder for the user to fill in; **flagged in "Needs your attention," not fabricated.**
- `tsconfig.json` (root) — add `sanity.types.ts` to `include` once generated; exclude `studio/` from the web app's TS project.
- `package.json` (root) — remove `sanity`, `@sanity/vision` (move to `studio/package.json`); keep `next-sanity`, `@sanity/image-url`; add a `typegen` convenience script that shells into `studio/` (`"typegen": "cd studio && npx sanity typegen generate"`).

## Requirements

- Schema fields follow AGENTS.md section 8 exactly:
  - **course**: title, slug, summary, cover image, level, price, `popular` flag (boolean, acceptable here — genuinely binary, not a status list), student count, learning outcomes (array of objects: icon/title/description), instructor (reference), category (reference), modules (array of embedded module objects, ordered).
  - **module**: embedded object — title, summary, ordered array of lesson references. No standalone document, no order field (order is array position).
  - **lesson**: document — title, slug, video URL, poster/thumbnail image, duration, free preview flag, student count, notes (Portable Text), key points (array of strings), optional pro tip (text), resources (array of `{type, title, description, url}`). No parent-course field — course/module context is derived via reverse reference (`*[_type=="course" && references(^._id)]`) at query time, per AGENTS.md ("A lesson does not store its parent course, so derive the course with a reverse reference when you need it").
  - **instructor**: name, slug, photo, expertise, bio.
  - **category**: title, slug, description.
- Use `defineType`/`defineField`/`defineArrayMember` throughout (never bare object literals).
- Icons on every document/object type, imported from `'@sanity/icons'` root export (per the installed v3.8.0 export map — not the subpath form the skill shows for newer versions).
- Slugs: `slug` type, `options.source: 'title'` (or `'name'` for instructor), `validation: rule.required()`, and a `rule.custom` uniqueness check scoped to the same `_type` (async, per schema.md pattern) for course/lesson/instructor/category.
- Portable Text (`lesson.notes`): standard block content — headings (H2/H3), lists, marks (strong/em/link), no exotic embeds for this prompt.
- Price: `number`, non-negative validation. Level: `string` with `options.list` (radio), not freeform. Duration: `string` (display format, e.g. "12m") — matches how it'll be shown in cards; not a number of seconds, since AGENTS.md doesn't ask for computed playback duration here (video documents handle timestamp precision separately in a later prompt).
- Resource `type` field: `options.list` (e.g. `pdf`, `link`, `code`, `download`) not freeform string — keeps the UI's icon-per-type mapping deterministic later.
- Validate `url` fields with `rule.uri({scheme: ['http','https']})`.
- `course.modules[].lessons[]` — reference array with `options.disableNew: true`? **No** — leave creation enabled; instructors may want to create a lesson inline while building a module. Use `to: [{type: 'lesson'}]`.
- Preview configs (`preview: {select, prepare}`) on every document type so Studio list/reference views are legible (course shows title+level, lesson shows title+duration, instructor shows name+expertise).
- Server read client: `useCdn: true` default, `token` only ever read via `process.env.SANITY_API_READ_TOKEN` inside server-only files (no `'use client'` directive anywhere in `sanity/lib/`).
- `defineLive` per the skill pattern, `serverToken` only (see decision above on `browserToken`).
- All GROQ queries via `defineQuery` (TypeGen-compatible), unique variable names, `_key` included in every array projection.
- Pagination not required yet (no catalog page in this prompt) — `getCourses()` returns all courses unfiltered; add pagination when the catalog page prompt lands.

## Security considerations

- `SANITY_API_READ_TOKEN` is a **read-only** viewer token (create/confirm scope in Sanity manage — flagged below), server-only, never in a `NEXT_PUBLIC_*` var, never imported into a Client Component.
- No write token anywhere in this prompt's scope — progress/writes are a later prompt per AGENTS.md.
- `.env.local` and `studio/.env` stay gitignored (already covered by root `.gitignore`'s `.env*` rule — confirm `studio/.env*` is also covered or add it explicitly since it's a new nested workspace).
- Dataset stays private; no public-read fallback introduced.

## Acceptance criteria

- `studio/` runs standalone (`npm install && npm run dev` inside `studio/`) on its own port, independent of the Next.js app.
- Studio schema shows Course, Lesson, Instructor, Category as top-level document types with working create/edit/preview; Module only appears nested inside Course, never as a top-level list.
- Root `app/studio/` route no longer exists; hitting `/studio` on the Next.js app 404s (expected — Studio is no longer embedded).
- `sanity/lib/data.ts` functions compile and return typed results once `sanity.types.ts` is generated.
- No client component or browser-shipped code imports `SANITY_API_READ_TOKEN` or `sanity/lib/client.ts` with a token attached.
- `.env.example` at repo root lists every var needed, with no real secrets.

## Checks to run

- Web (root): `npm run lint`, `npx tsc --noEmit` (or the project's type-check script if one exists — confirm in `package.json`), `npm run build`.
- Studio (`studio/`): `npm install`, `npx sanity schemas extract --force && npx sanity typegen generate` (or rely on `sanity dev` auto-typegen), confirm no schema validation errors on `npm run dev` startup.
- Do **not** run `sanity deploy` — that pushes to the live hosted Studio and is a shared-system action; left for the user to run manually (see below).

## Manual test steps

1. `cd studio && npm install && npm run dev` → Studio opens at `localhost:3333`, shows Course/Lesson/Instructor/Category in the nav, no console schema errors.
2. In Studio, create one Instructor, one Category, one Lesson (with a video URL and some Portable Text notes), then one Course referencing them and embedding a module that references the lesson. Confirm previews render title/subtitle correctly in each list view and in the course's embedded module list.
3. Confirm slug uniqueness validation: try creating a second course with the same slug — Studio should block publish with a validation error.
4. From repo root: `npm run dev` → confirm the Next.js app still boots and `/studio` now 404s (no embedded route).
5. `npm run lint` and `npx tsc --noEmit` at root — zero errors.
6. In a scratch server file (or a temporary test route removed before commit), call `getCourses()` from `sanity/lib/data.ts` and confirm it returns the course created in step 2 with resolved instructor/category names — proves the read token and server client work end-to-end.

## Needs your attention (will surface in the final report, not decided silently)

- `SANITY_API_READ_TOKEN` does not exist yet — user must create a **Viewer**-scoped token in Sanity manage (manage.sanity.io → project `6xdciolp` → API → Tokens) and add it to `.env.local` (root) locally; I will add the placeholder line and `.env.example` entry but cannot fabricate the token value.
- The Sanity Context MCP (search, later prompt) requires a **deployed** Studio, not just a schema deploy — user should run `cd studio && npx sanity deploy` once ready; not run automatically since it's a shared/live action.
- CORS origins for `localhost:3000` (and eventual prod URL) need adding via `npx sanity cors add` or Sanity Manage — not actioned automatically.
