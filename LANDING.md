# Mytheus — Web UI (start here)

This is the **actual state** README for the `web/` app as it exists today: the full Mytheus UI
surface on mock data — the marketing site (landing + pricing + 12 feature pages + legal/company
pages) **and** every authenticated screen (dashboard, meeting room + agent sidebar, transcript,
decisions, tasks, org, search, settings, billing, admin/ops). If you're a new session or
teammate picking this up, read this first, then `PROGRESS.md` for the full detail.

> Two other docs in this folder — `README.md` and `system.md` — describe the *wired* `reprise-ui`
> product (Clerk, Socket.io, LiveKit, Server Actions). That plumbing is **not built yet**: every
> screen here renders from `src/lib/mock/data.ts` and auth is bypassed. Route-by-route status:
> `docs/PAGES.md`.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000   (predev auto-cleans a stale prod .next)
npm run build    # production build (56 static pages)
npm run lint
npm run clean    # manually clear a stale prod .next if dev 404s on chunks
```

Requires Node 20+. Stack: **Next.js 14.2.35** (App Router, TypeScript) · **Tailwind 3.4** ·
**framer-motion 12** · React 18. No Clerk / TanStack / Zustand / shadcn yet — those arrive with
the real plumbing.

## Status

✅ **Complete on mock data and shipping-green** (last verified 2026-07-06): `tsc --noEmit`
clean, `next lint` clean, `next build` clean (56 static pages), every animation
reduced-motion-guarded, zero horizontal overflow down to 320px across the landing page, no
dead links. Latest work: the six-agent responsive + motion pass (THE RELAY pinned scene with
the LoadTrend chart, calm slot-based LiveCapture, new loader/hero choreography, inside-app
polish). Details + build gotchas in `PROGRESS.md`.

## The 30-second map

- **Design:** warm **"Claude light"** palette (cream `#faf9f5` base + clay/coral `#d97757`
  signal), **all-grotesk tight type** (Geist; Fraunces serif was dropped), soft pills + big
  rounded cards. The signature visual is an interactive **`<ConnectedGraph>`** (a canvas
  knowledge-graph that brightens near the pointer) — it **replaced** the old static glossy
  `<Orb>`. Several sections are bespoke scripted demos of the product loop. All tokens live in
  `src/app/globals.css`.
- **Positioning (locked):** Mytheus is its OWN meeting platform — no Zoom/Meet/Teams/Slack/Jira
  integrations. Sells: own meetings · a personal AI agent per participant · **agents that
  collaborate across meetings** (the differentiator).
- **Page:** `src/app/(marketing)/page.tsx` composes the sections (two-act hero → in-the-room
  capture → THE RELAY statement → pinned steps → memory timeline → FAQ → CTA → footer). The two
  signature scroll pieces are the hero (live capture card gathers + exits, page two assembles
  letter-by-letter with the `NotesWidget`) and the Statement relay (4-beat scroll-scrubbed
  `PinnedScene` — heading inside the pin, packet exchange between agents, animated `LoadTrend`
  capacity chart). LiveCapture deliberately does NOT scroll-pin — it auto-plays in view with a
  height-stable slot layout. Atoms in `src/components/landing/ui.tsx`; living graph in
  `ConnectedGraph.tsx`; motion primitives in `motion.tsx` (catalog: `docs/MOTION.md`).
- **Routes:** grouped into `(marketing)` / `(auth)` / `(app)` / `(admin)` — all built (the app
  and admin shells on mock data; see `docs/PAGES.md`). The secondary marketing/legal routes
  (enterprise, students + verify, blog, careers, privacy, terms, security) are real pages on the
  shared `src/components/marketing/` shell (`PageShell` / `PageHero` / `Prose`); `/sign-in` and
  `/sign-up` currently redirect to `/dashboard` (auth bypass). Plus a real on-brand
  `not-found.tsx`.
- **Orphaned:** six old "hand-set machine" components (`ColorBlocks`, `LiveSimulation`,
  `LogoGrid`, `ScrollStory`, `TypographyBreak`, `WorksEverywhere`) are kept but no longer
  imported — see `PROGRESS.md`.

## Where to look

| You want… | Go to |
| --- | --- |
| **Design principles (the why — colour, type, motion, components)** | **`design.md`** |
| Full progress log, decisions, what's next | `PROGRESS.md` |
| Design tokens / colors / fonts | `src/app/globals.css`, `src/app/layout.tsx` |
| Page composition | `src/app/(marketing)/page.tsx` |
| A specific section | `src/components/landing/*` (table in `PROGRESS.md`) |
| The product spec (future phases) | `README.md`, `system.md`, `../reprise-docs/20-frontend-architecture.md` |

## Conventions

Brand name is **Mytheus** (never "NEXUS" in copy — that's only the PDF codename). When this lands
in the `reprise-ui` repo, commits/PRs must **NOT** carry a `Co-Authored-By` footer; use
conventional commits.
