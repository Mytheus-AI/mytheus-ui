# Frontend Progress — Mytheus Web UI

> Handoff log for the frontend built in `web/`. Running record of
> what's done, the decisions behind it, and what's next — so a fresh session has full
> context without re-reading the tree.
>
> **Owner:** Yash V Maurya · **Scope now:** the full public site (landing + pricing +
> 12 feature pages) **and** the authenticated app shell (every doc-20 screen, mock data).
> **Last verified (2026-07-03):** `tsc --noEmit` clean · `next lint` clean · `next build`
> clean (**56 static pages**). Contributor docs live in `docs/` (DESIGN-SYSTEM, MOTION,
> PAGES, MOCK-DATA, CONTRIBUTING).

---

## 2026-07-03 — the "4-July" pass (latest)

Executed the full `4-july.md` brief, UI-only (no sockets/Server Actions/Clerk yet):

- **Motion system:** new `PinnedScene`, `ScrollScale`, `StageSwitch`, `Sticky` primitives
  in `landing/motion.tsx`; Lenis instance exported for programmatic scrolls. Catalog in
  `docs/MOTION.md`.
- **"How it works"** rebuilt as a scroll-pinned sequential scene (progress spine +
  odometer + per-stage live mini-demos). **"Between meetings"** rebuilt as the enterprise
  workload scene (team-capacity bars, 96% red flag, sourced answer + lineage).
- **Priority tokens** (`--priority-high/medium/low` + softs) added; Card/Badge de-hexed.
- **Marketing:** `/pricing` (honest doc-18 matrix) + `/features` hub + 11 feature pages
  from a single copy registry (`src/lib/marketing/features.ts`); header Features menu,
  restructured two-band footer.
- **App (Part 4):** auth bypassed (`/sign-in|/sign-up` → `/dashboard`, all CTAs point
  at the app); meeting room with video-grid mock, captions, chat, and the frozen
  9-section agent sidebar (Confirm is the only commit path); meeting detail, transcript
  (search + speaker colors), `/decisions` (lineage), `/tasks`, `/org`,
  `/settings/{profile,integrations}`, `/ops`; sectioned sidebar nav. All mock-driven —
  see `docs/MOCK-DATA.md` and `docs/PAGES.md`.
- **Polish:** dashboard stat tiles + agent digest + join-room CTA; hero announcement
  pill/trust line; logo spin-on-hover + roll-in-on-load.

Still TODO: real plumbing (LiveKit, Socket.io reducers, Server Actions, Clerk) and the
Vitest/Playwright suites the canon calls for.

---

## TL;DR — status

**The public site and the app shell are complete and shipping-green.** The landing page
started from a "Playex-style" rebuild (2026-06-25) on a warm Claude-cream palette and grew
bespoke interactive demos; the 4-July pass added the cinematic pinned scenes, all
marketing/feature pages, and every authenticated screen on mock data. Builds with zero
type errors, prerenders 56 static pages, every animation is
`prefers-reduced-motion`-guarded, no dead links.

| Check | Status |
| --- | --- |
| `tsc --noEmit` | ✅ clean |
| `next lint` | ✅ clean |
| `next build` | ✅ clean — 56 static pages |
| Reduced-motion | ✅ animations guarded (CSS + framer `useReducedMotion`) |

---

## CURRENT design direction

**Warm "Claude light" palette + bespoke living visuals.** The page keeps the Claude.ai warm
cream + clay/coral look, all-grotesk tight type, soft pills and big rounded cards. The headline
change from the earlier snapshot: the **static glossy `<Orb>` is gone**, replaced by an
**interactive `<ConnectedGraph>`** (a canvas knowledge-graph), and several sections are now
**purpose-built scripted demos** of the actual product loop rather than decorative blocks.

### Palette / tokens (single source of truth: `src/app/globals.css`)
- **Warm cream base:** `--bg #faf9f5` / `--bg-2 #f3f1ea` / `--bg-3 #ede9de`.
- **Warm-dark inks:** `--ink-display #26231d`, `--ink-2 #423e36`, `--ink-3 #6f6a5f`,
  `--ink #1c1a15`. Warm hairline `--line #e7e2d6`.
- **One signal — Claude clay/coral:** `--signal #d97757`, `--signal-deep #bd5d3a`,
  `--signal-bright #e8a489`, `--signal-soft #f5e5dc`, `--signal-glow rgba(217,119,87,.5)`.
  Used as the living-graph accent, glows, **and** the primary CTA fill.
- `--pill #26231d` (warm near-black) for dark icon buttons/chips.
- **Soft pills + big rounded cards:** `--radius-pill 40px`, `--radius-card 24px`. Subtle grain.

Tokens are surfaced as Tailwind colors in `tailwind.config.ts` (`bg`, `ink`, `ink-2`, `ink-3`,
`ink-display`, `line`, `signal*`, `pill`, + compat aliases). Components read tokens, never raw
hex — `<ConnectedGraph>` even samples the CSS vars at runtime so it always matches the theme.

> If the lilac brand signal ever needs to return, it's a one-line swap of the `--signal*` tokens.

---

## What this is (and is NOT)

`web/` is **only the unauthenticated marketing landing page** plus branded "Coming soon"
placeholders for every footer/nav link. Standalone Next.js 14 app in the `web/` subfolder (repo
root `Reprise-AI` has capitals npm rejects).

It is **not** the full `reprise-ui` product app. The meeting room, agent sidebar, dashboards,
search, settings, billing, admin consoles in `README.md` / `system.md` /
`reprise-docs/20-frontend-architecture.md` are **future phases (P2+)**, not built here. Those docs
are the *spec*; this `PROGRESS.md` is the *actual state*.

### Route-group scaffold (staged, not yet built out)
The routes have been reorganized toward the `reprise-ui` spec's App Router layout:
- `src/app/(marketing)/` — the landing page + all "Coming soon" pages.
- `src/app/(auth)/` — `sign-in` / `sign-up` placeholders.
- `src/app/(app)/`, `src/app/(admin)/`, `src/app/api/` — **empty `.gitkeep` placeholders** marking
  where the authenticated shell, admin consoles, and route handlers will live (P2+). Nothing
  rendered yet.

---

## Product positioning (locked — do not drift)

**Mytheus is its OWN meeting platform.** No Zoom / Meet / Teams / Slack / Jira / calendar
integrations. Meetings happen *inside* Mytheus (own meeting SDK per the plan). The landing leads
with: own meetings (no external bot) · a **personal AI agent per participant** · agents that
**collaborate across meetings** (the differentiator).

Brand: **Mytheus** (tagline *"Every meeting, on repeat."* — the giant hero headline). Never
use "NEXUS" in copy (that's only the PDF codename).

---

## Page structure (`src/app/(marketing)/page.tsx`)

All sections are client components (each owns its own motion/canvas):

```
<Loader>              "Standing Wave" intro: a clay pulse plucks a field of threads,
                      then the panel wipes right to reveal the hero
<ScrollProgressBar>   thin clay top scroll bar
<SiteHeader>          lean pill header — wordmark + single Sign-up CTA
<main>
  <Hero>              two-act pinned stage. Page one: headline + CTA left + a live "Q3 GTM
                      sync" capture card (agent-listening orb, ticking timer, shorthand lines
                      already tagged Action/Decision, a "classifying" live line, "Minutes
                      forming · 3 captured", "See it become minutes" hook) — the cluster
                      gathers and slides off-left on scroll; page two then assembles "Your
                      shorthand, returned as minutes." letter-by-letter alongside the live
                      NotesWidget. (The Granola raw→enhanced notepad now lives IN the hero,
                      no longer a standalone section.) Reduced-motion/mobile = stacked.
  <FeatureCards>      thin passthrough → <LiveCapture>
    <LiveCapture>     "in the room": transcript streams left, structured captures
                      (Note/Decision/Action/Conflict/Context) pop right in sync; auto-plays
                      in view (NO scroll-jacking), holds, then loops. Uses <ConnectedGraph>.
  <Statement>         "between meetings" — one focused idea + a living <ConnectedGraph>
  <Steps>             "How it works" — a meeting flows in and self-driving steps process it
  <MemoryTimeline>    Linear-roadmap diagram: a week of meetings as swimlanes; decisions are
                      clay diamonds; threads converge into Friday's standup ("Monday's decision
                      is Friday's context"). Threads draw on scroll; pulses travel forever.
  <FAQ>               objection-handling accordion (no-bot, own-platform, confirm-before-write,
                      agent-to-agent, privacy, free-to-start); one row open, reduced-motion safe
  <FinalCTA>          closing rounded stage echoing the hero + a signal <ConnectedGraph>
<SiteFooter>          wordmark + socials + 3 link columns + working email pill
```

### Active components (`src/components/landing/`)

| File | Role | Notes |
| --- | --- | --- |
| `ui.tsx` | Design-system atoms: `PillCTA` (clay split-pill + circular arrow), `OutlinePill`, `IconCircle`, `IconChip`, `Eyebrow`, icons (`ArrowRight`/`Plus`/`Play`). **`Orb` was removed.** | server-safe |
| `ConnectedGraph.tsx` | **Replaces `<Orb>`.** A canvas network of drifting nodes + edges that brighten near the pointer — a stand-in for `nexus_knowledge`. Same prop surface as the old Orb (`className`/`signal`/`glow`/`float`), so it drops into the old layouts unchanged. Reads colors from the token layer. Reduced-motion → one static frame. | client |
| `Loader.tsx` | "Standing Wave" page-load intro (rewritten; **no longer orphaned**). Imperative counter, one continuous gradient-crest path per thread. | client |
| `SiteHeader.tsx` | Lean header — wordmark + Sign-up. | client |
| `Hero.tsx` | Two-act pinned hero (cards converge + exit left → page two assembles letter-by-letter) + the redesigned live capture card ("Composure"). | client |
| `NotesEnhanceDemo.tsx` | Exports `NotesWidget` (raw→enhanced notepad) — now rendered inside the Hero page-two, no longer a standalone page section. | client |
| `FeatureCards.tsx` | Thin passthrough to `LiveCapture`. | server |
| `LiveCapture.tsx` | Self-contained auto-playing "in the room" capture demo (fixed size, loops; not scroll-pinned). | client |
| `Statement.tsx` | Differentiator statement + `ConnectedGraph`. | client |
| `Steps.tsx` | "How it works" workflow. | client |
| `MemoryTimeline.tsx` | Cross-meeting memory swimlane diagram. | client |
| `FAQ.tsx` | Objection-handling accordion before the final CTA. | client |
| `FinalCTA.tsx` | Closing CTA stage + `ConnectedGraph`. | client |
| `SiteFooter.tsx` | Footer. | client |
| `mockups.tsx` | Shared mock UI pieces (note windows, video tiles, etc.) reused across Hero/demos. | — |
| `motion.tsx` | Shared framer-motion primitives (`Reveal`, `Stagger`/`StaggerItem`, `WordReveal`, `MaskReveal`, `Marquee`, `Parallax`, `ScrollProgressBar`, `CTAButton`, …). All `useReducedMotion`-guarded. | client |

`ConnectedGraph` is also used by `not-found.tsx` and `ComingSoon.tsx`.

### Orphaned components (kept, NOT imported — 0 references)

`ColorBlocks.tsx`, `LiveSimulation.tsx`, `LogoGrid.tsx`, `ScrollStory.tsx`,
`TypographyBreak.tsx`, `WorksEverywhere.tsx`. Leftovers from the older "hand-set machine"
direction; they still compile but nothing imports them. Keep for reference or delete when
comfortable. (`LiveSimulation` — the interactive scripted meeting demo — is the most reusable;
it could return as a product/feature demo later.)

---

## Routes & placeholders

`(marketing)/page.tsx` is the landing page. The secondary marketing/legal routes are now
**real pages** (built 2026-06-30, replacing the old "Coming soon" placeholders), all sharing one
cohesive shell: `/enterprise` · `/students` · `/students/verify` · `/blog` · `/careers` ·
`/privacy` · `/terms` · `/security`. Only `/sign-in` · `/sign-up` remain branded `ComingSoon`
placeholders (real auth is a later, Clerk-dependent step). Plus a real on-brand `not-found.tsx`
(404) — giant grotesk "404", a living `ConnectedGraph`, witty line, marquee. CTAs are
signup-based ("Get started free" → `/sign-up`).

**Shared page scaffolding (`src/components/marketing/`):** `PageShell` (sticky wordmark header +
`SiteFooter`), `PageHero` (eyebrow + grotesk title + blurb + optional `PillCTA`, over the mesh
field + a faint `ConnectedGraph`), and `Prose` (consistent long-form typography for the
legal/security pages). The new pages compose these + the landing tokens/atoms — all on-brand clay,
no lime, reduced-motion safe. `students/verify` is a client page (validated email form → success
state); the rest are server components. `ComingSoon.tsx` is still used by the two auth routes.

---

## Build / dev gotchas

- **Windows `.next` contention:** kill any running `next start`/`next-server` before `next build`
  or you get a bogus `PageNotFoundError: /_document`. Clean build = no server running + `rm -rf .next`.
- **Dev self-heal:** `scripts/dev-clean.mjs` + a `predev` hook delete a stale production `.next`
  (one with a BUILD_ID) so `npm run dev` doesn't 404 on chunks after a build. `npm run clean` runs it.
- **`overflow-x`:** keep `body { overflow-x: clip }` (NOT `hidden`) in `globals.css` — `hidden`
  turns `body` into a scroll container. (The old 300vh scroll-pinned LiveCapture conveyor is gone;
  it now auto-plays in view, so the sticky-ancestor caveat no longer applies.)

```bash
npm run dev      # http://localhost:3000 (predev cleans stale prod .next)
npm run build    # production build
npm run lint
npm run clean
```

Stack: Next.js 14.2.35 (App Router, TS), Tailwind 3.4, framer-motion 12, React 18. Fonts: Geist +
Geist Mono (local). **Fraunces removed.** No Clerk / TanStack / Zustand / shadcn yet.

---

## What's next (not yet started)

1. **Wire real auth** — replace `/sign-in` & `/sign-up` placeholders with Clerk (needs keys; the
   only secondary routes still on `ComingSoon`).
2. **Decide orphaned-component fate** — delete the 6 superseded files, or repurpose `LiveSimulation`
   as a product demo section.
3. **Begin the authenticated app shell (P2)** — fill the `(app)`/`(admin)`/`api` scaffold per the
   spec docs; larger effort, likely a team decision on repo structure first.

### Done 2026-06-30
- **Real secondary pages** — blog · careers · enterprise · students (+ verify) · privacy · terms ·
  security now ship real, on-brand content (replaced the "Coming soon" placeholders), built by
  **6 parallel agents** on a shared `PageShell` / `PageHero` / `Prose` scaffold. Positioning held
  (own platform, no integrations, confirm-before-write); legal pages avoid certification claims;
  security framed compliance as "working toward SOC 2".
- **Hero capture-card redesign** ("Composure") — chosen via a 4-design × 3-judge (craft / scroll-hook /
  feasibility) tournament: agent-listening presence orb, a genuinely ticking timer, settled shorthand
  already tagged Action/Decision while the live line is still "classifying", a "Minutes forming ·
  3 captured" progress bar, and a "See it become minutes" scroll hook. All reduced-motion guarded.

### Deferred to the team (do NOT unilaterally decide)
Monorepo vs polyrepo, the GitHub remote under github.com/Reprise-AI, branching strategy.

### Repo conventions when this lands in `reprise-ui`
Commits/PRs in `reprise-ui` must **NOT** include a `Co-Authored-By` / session footer.
Conventional commits (`feat:`, `fix:`, `chore:`, …).
