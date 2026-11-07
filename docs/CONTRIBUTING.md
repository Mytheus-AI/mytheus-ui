# Contributing

How to work in `mytheus-ui` without fighting it. Read `../CLAUDE.md` first -
it is the authoritative constraints document; this file is the practical
tour.

## Setup

Node 20+ required.

```bash
npm install
npm run dev        # http://localhost:3000 (predev auto-cleans a stale .next)
npm run build      # production build
npm run lint       # ESLint
npx tsc --noEmit   # typecheck
npm run clean      # manual .next clean
```

The architecture canon specifies pnpm; this working tree currently uses npm
(there is a `package-lock.json`). Use whichever the lockfile says - do not
introduce a second lockfile.

### Dev server or production build: pick by what you are doing

`npm run dev` is for **editing**. It compiles each page the first time you open
it and again after every change, never prefetches links, and runs React's
development build, so clicking around feels slow: a first visit to a page takes
about 0.5-1.5s, and the very first page after starting can take 5-9s.

To **click through the app, demo it, or judge how fast it is**, use the
production build instead. Pages are compiled ahead of time and links prefetch,
so a page answers in about 10-80ms:

```bash
npm run build && npm start   # http://localhost:3000, same as dev
```

It does not pick up code changes: rebuild after editing. Never judge the app's
speed from `npm run dev`.

Icons: Server Components import icons from `@phosphor-icons/react/dist/ssr`.
That entry re-exports about 1,500 icons and is listed in `optimizePackageImports`
in `next.config.mjs` so a page compiles only the icons it uses. If you import
from any other phosphor entry, add it to that list, or every dev compile of the
importing page pulls in about 3,000 extra modules.

Windows note: do not run `next build` or `next start` while `next dev` is
running - they share `.next` and corrupt each other (symptom: 500s with
"Cannot find module './NNNN.js'"). Stop dev, build, then restart dev; the
`predev` hook self-heals the directory.

Copy `.env.example` to `.env` and fill it in: sign-in is real (Clerk), so the
Clerk keys are required, and `API_GATEWAY_URL` points at the gateway (set it to
`https://api.mytheus.cloud` to use the deployed backend). The full list is in
`../CLAUDE.md` (Local development).

## Conventions that gate a PR

- TypeScript strict, no `any`.
- RSC first. `"use client"` only for interactivity, browser APIs, or a live
  subscription, and as leaf-ward as possible. The meeting room is the only
  heavy client bundle and it must stay on its own route.
- Tokens only: no raw hex in components. See
  [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
- Motion through the shared primitives, reduced-motion safe. See
  [MOTION.md](MOTION.md).
- Accessibility is a gate: keyboard reachability, focus order, `aria-*` on
  interactive widgets, and priority-strip contrast.
- Mutations (when real) are Server Actions through `api-gateway`/`bff` with
  an `Idempotency-Key`; the browser never talks to a service directly and
  never handles `org_id`.

## Naming authority

Service, topic, and entity names are frozen in the `mytheus-docs` repo
canon (`_canon/`): `agent-stream`, `agent-results`, `transcript-chunks`,
`decisions`, `actions`, `meeting_id`, `nexus_knowledge`, and friends. Never
invent or rename one in the UI. Marketing copy markets by benefit and never
exposes internal agent class names.

## Where things go

| What | Where |
| --- | --- |
| routes, layouts, redirects | `../src/app/` (route groups: `(marketing)`, `(auth)`, `(app)`, `(admin)`) |
| app UI primitives | `../src/components/ui/` |
| meeting room pieces | `../src/components/meeting/`, `../src/components/sidebar/` |
| app shell (nav, topbar, settings tabs) | `../src/components/app/` |
| landing sections + motion | `../src/components/landing/` |
| marketing shell + feature-page template | `../src/components/marketing/` |
| feature-page copy registry | `../src/lib/marketing/features.ts` |
| mock data | `../src/lib/mock/data.ts` (see [MOCK-DATA.md](MOCK-DATA.md)) |
| tokens + global CSS | `../src/app/globals.css`, `../tailwind.config.ts` |

## Quality gates

Before calling anything done:

1. `npm run lint` clean.
2. `npx tsc --noEmit` clean.
3. `npm run build` clean (everything currently prerenders statically).
4. Walk the routes you touched, including keyboard-only and, for landing
   work, with reduced motion enabled.

## Commits and PRs

Trunk-based, short-lived branches, conventional commits (`feat:`, `fix:`,
`refactor:`, `docs:`, `chore:`, `test:`).

Commits and PRs in this repo must not include a `Co-Authored-By` footer.
