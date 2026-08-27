# Add Clerk Authentication

## Goal

Wire up Clerk authentication into the Vertex Next.js app so learners can sign up, sign in, and see their account state, per AGENTS.md section 7: "Authentication is Clerk. Do not use Sanity's auth or roll your own. Keep browsing public and gate only what a feature marks as protected."

This is foundational auth only — no protected routes exist yet to gate (My Learning, progress, etc. aren't built). This step installs Clerk, adds the provider, adds middleware, and puts visible sign-in/sign-up/account controls in the header.

## Skills read

- `clerk-setup` (`.claude/skills/clerk-setup/SKILL.md`) — quickstart-driven setup process, framework detection, CLI usage, common pitfalls.
- AGENTS.md sections 2 (workflow), 5 (server/client boundaries), 6 (tech stack), 7 (decisions already made), 12 (gotchas), 13 (checks).

## Code inspected

- `package.json` — plain Next.js 16.3.2 app, React 19.2.8, Tailwind 4, no auth library, no `@clerk/*` deps.
- `app/layout.tsx` — root layout renders `<html><body>{children}</body></html>` with Inter/Playfair fonts. No providers wrap children yet.
- `components/site-header.tsx` — shared header with logo, nav (`Courses`, `My Learning`), a static notification bell button, and a static gray circle standing in for an avatar (`UserIcon` in a `span`, not a real control).
- No `middleware.ts` / `proxy.ts` exists.
- No `.env*` files exist yet.
- No `components.json` — the project is not using shadcn/ui, so no theme package is needed.
- Repo root is currently the whole app (no `studio/` + `web/` workspace split — Sanity hasn't been introduced yet). Per user decision, Clerk is installed directly at repo root; the workspace split is deferred to whenever Sanity setup happens. When that split occurs, this becomes the `web` workspace.
- No global `clerk` CLI is installed, and the user is not currently authenticated to Clerk CLI.

## Decisions and assumptions

- Use `@clerk/nextjs` (current SDK naming, not the Core 2 `clerk-react` naming) since this is Next.js 16 / React 19.
- Install and drive setup with the Clerk CLI (`clerk init`) rather than manually copying quickstart snippets, since the CLI detects the framework and package manager (npm, per `package-lock.json`) and wires provider/middleware/env automatically.
- Since this is an existing project (not empty), run `clerk init` without `--framework`/`--pm` overrides, letting it auto-detect.
- No specific Clerk app ID was provided by the user for this project, so `clerk init` will use its default flow (login-and-link or accountless dev keys, whichever the CLI offers) rather than forcing a link to a specific `app_xxx`. If the CLI prompts for account linking, follow its interactive flow.
- `middleware.ts` (not `proxy.ts`) is correct for this Next.js version per the skill/AGENTS instructions (App Router, Next.js 15 and earlier convention — confirm actual required filename against `node_modules/next/dist/docs/` before finalizing, since AGENTS.md warns this Next.js version may have renamed/changed conventions).
- Auth controls replace the two static placeholder elements in `SiteHeader` (`components/site-header.tsx:17-31`): the static avatar circle becomes Clerk's `UserButton` when signed in, and `SignInButton`/`SignUpButton` render when signed out. The notification bell is left untouched (it's explicitly out of scope — AGENTS.md marks the notifications bell as presentational-only).
- No routes are protected yet — middleware is added in permissive/scaffolded form (public by default) since no feature currently needs gating. Matcher still follows Clerk's required convention (`'/((?!.*\\..*|_next).*)', '/'`) so future protected routes work without re-touching middleware.
- Keep publishable key client-exposed (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) and secret key server-only (`CLERK_SECRET_KEY`), written by the CLI to `.env.local`. Will not read or print the contents of that file.

## Files expected to touch

- `package.json` / `package-lock.json` — add `@clerk/nextjs` dependency (via CLI).
- `.env.local` — new file, written by `clerk init` (not read/printed by me).
- `middleware.ts` — new file, Clerk middleware with matcher.
- `app/layout.tsx` — wrap `children` in `<ClerkProvider>` inside `<body>`.
- `components/site-header.tsx` — replace static bell-adjacent avatar placeholder with real Clerk auth controls (`SignInButton`, `SignUpButton`, `UserButton`, `Show`/`SignedIn`/`SignedOut` as appropriate).

## Requirements

- Follow the CLI-first flow from the skill: check for `clerk` CLI, install if missing (npm global), `clerk init` (auto-detect framework/pm for this existing project).
- Verify the middleware matcher includes the Clerk auto-proxy path per AGENTS/skill instructions, if applicable to this SDK version.
- `ClerkProvider` inside `<body>`, not wrapping `<html>`.
- Auth controls integrated into the existing `SiteHeader` so they look native to the current design (reuse existing button/icon patterns, sizing — `size-10 rounded-full` circle already used for the avatar slot), not bolted on.
- No shadcn theme work (no `components.json` present).
- Don't touch the bell/notifications icon or nav links.
- Don't create any protected routes or gating logic — none is needed yet.

## Security considerations

- `CLERK_SECRET_KEY` must never appear in client components or be imported into anything under `"use client"`.
- Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` reaches the browser.
- I will not read or print `.env.local` contents in chat; I'll only confirm the CLI reports success.

## Acceptance criteria

- `npm run dev` starts cleanly with Clerk installed.
- Header shows Sign In / Sign Up controls when signed out, and a `UserButton` when signed in — replacing the old static placeholder.
- `clerk doctor` reports a healthy integration.
- Sign-up flow works end to end (new test user can be created).
- No secret key leaks into client bundles (spot check: grep built output or client component imports for `CLERK_SECRET_KEY`).

## Checks to run

- `npm run lint`
- `npx tsc --noEmit` (type check — no dedicated script exists, confirm this is the right invocation or add one if missing)
- `npm run build` (routes/config/root layout are changing)
- `clerk doctor`
- `npm run dev` — manual verification (see test steps below)

## Manual test steps

1. Run `npm run dev`, open the app in a browser.
2. Confirm the header shows "Sign In" and "Sign Up" controls in place of the old gray placeholder circle.
3. Click Sign Up, create a new test account through Clerk's flow.
4. After sign-up completes, confirm the header now shows a `UserButton` (avatar) instead of Sign In/Sign Up.
5. Click the `UserButton`, confirm the Clerk account menu opens (profile, sign out).
6. Sign out, confirm the header reverts to Sign In/Sign Up.
7. Confirm the notification bell and nav links (`Courses`, `My Learning`) are unchanged throughout.
