# Frontend Progress — Mytheus Web UI

> Handoff log for the frontend built in `web/`. Running record of
> what's done, the decisions behind it, and what's next — so a fresh session has full
> context without re-reading the tree.
>
> **Owner:** Yash V Maurya · **Scope now:** the full public site (landing + pricing +
> 12 feature pages) **and** the authenticated app shell (every doc-20 screen, mock data).
> **Last verified (2026-07-24):** `tsc --noEmit` clean · `next lint` clean across the whole
> project. Contributor docs live in `docs/` (DESIGN-SYSTEM, MOTION, PAGES, MOCK-DATA,
> CONTRIBUTING).

---

## 2026-07-24 — Hero rebuilt; new NetworkFlow interstitial (two rebuilds); landing cleanup pass

**Hero** (`Hero.tsx`) simplified across several rounds of direct user feedback down to: a
full-viewport clay→cream gradient wash (deep near-black top `#631f0f` → a lighter `#e2916f`
at the headline → `--signal-bright`/`--signal-soft`/`--bg`), the H1 "The room / *remembers.*",
a handwritten beat ("even the meeting you missed."), two CTA pills, and a bottom scroll cue —
full stop. Two things that were tried and explicitly cut: a literal answer-card payoff under
a "What did you decide last Tuesday?" question-style headline, and a timezone-chip strip
(inspired by an Andrei Gorskikh portfolio reference the user shared) — both shipped, both
removed on direct feedback. The flanking arc rings from that same reference survived. The
entire product "bento" demo cluster that used to live under the Hero statement (live-notes /
memory / decision / ask-bar cards) was deleted outright, not hidden — nothing in the deleted
~500 lines is reproduced elsewhere yet. `WordReveal`'s per-word masks (`motion.tsx`) gained
horizontal clipping compensation (they only had vertical before) — a site-wide fix for
italic-accent glyphs (trailing "?", "y", ".") getting shaved at word-mask edges.

**NetworkFlow** (`NetworkFlow.tsx`, new file, mounted between `Hero` and `FeatureCards` via
a `<div data-dark-zone>` wrapper in `page.tsx`) is the cinematic cut the user asked for
straight after the Hero scroll — "the screen turns black" — built TWICE:

1. First version: a `PinnedScene`-driven 4-beat scene with `ConnectedGraph` (an existing
   canvas node/edge component) as an animated dot-network backdrop. Functionally shipped and
   fully debugged (see `docs/MOTION.md`'s "learned the hard way" list for the three real bugs
   this produced and their fixes — sticky-pin scroll-math for a shared header's light/dark
   threshold, and a raw-vs-springed-progress desync bug). Then the user rejected the
   backdrop itself outright: *"the neural network thingy made that balls... I don't like
   it."*
2. Current version: same cinematic beat (hard cut to `#0d0b08` right after Hero, dissolving
   to the site's cream via a static bottom gradient — no scroll-driven color math at all this
   time), but the content is now 4 concrete product-UI mockup panels — Live capture, Decision
   confirmed, Carried forward, Ask anything — connected by a single hand-drawn thread down the
   left edge, each revealing independently via ordinary `whileInView` as it scrolls into
   place. Deliberately NOT built with `PinnedScene` this round — see the new rules added to
   `docs/MOTION.md` this session. Explicit user constraint driving the panel design: **no
   AI-generated, stock, or literal `<img>` imagery anywhere** — every visual is coded
   HTML/CSS/SVG matching the exact card-chrome craft level already established in
   `Statement.tsx` / `steps/demos.tsx` (rounded-card white surfaces, mono `kicker` labels,
   checkmark badges, avatar-initial chips).

**Landing-page cleanup pass** (user: "check the whole landing page... remove the unnecessary
you feel, and just do it"): a conservative audit of `FeatureCards`/`LiveCapture`, `Statement`,
`Steps` (+ `steps/demos.tsx`), `MemoryTimeline`, `FAQ`, `FinalCTA`, `SiteFooter`, `SiteHeader`.
One real fix landed — `LiveCapture.tsx`'s connector-beam glow used a raw `rgba(217,119,87,…)`
literal instead of the `--signal-glow` token every sibling glow effect uses. Everything else
(dead code, broken links, placeholder copy, "cross-meeting memory" appearing in three
different sections) was checked and found to be either clean or a deliberate structural
reinforcement, not clutter. **Flagged, not deleted:** `NotesEnhanceDemo.tsx` (678 lines,
zero importers anywhere in `src/`) — an apparently-orphaned component from an earlier
redesign pass; worth a deliberate decision on whether to delete or keep parked.

Both this session's rebuilds were built by parallel background agents from detailed specs,
per explicit user request — and in both cases the agents' own "tsc/lint clean" reports were
NOT sufficient on their own; a manual screenshot-based scroll-through (recreated CDP harness,
`shot.js`, in the session scratchpad) caught every real bug listed above. Worth remembering
for any future delegated visual/motion work on this codebase.

---

## 2026-07-06 — six-agent responsive + motion pass

Executed the "every segment responsive + crazier animations + inside-UI polish" brief with
**six parallel agents under exclusive file ownership** (shared files — `motion.tsx`, `ui.tsx`,
`mockups.tsx`, `ConnectedGraph.tsx`, `globals.css`, `tailwind.config.ts`, `lib/**` — were
off-limits to all of them; zero conflicts).

- **Statement rebuilt as "THE RELAY"** — the "Between meetings" section is now a 4-beat
  scroll-scrubbed `PinnedScene` (the moment → the ask → the return → the proof): a packet
  travels quadratic-bezier arcs between two agents, fully scrub-reversible. Two new
  conventions born here (see `docs/MOTION.md`): the **section heading lives INSIDE the pin**
  (`SceneHeading` — eyebrow + h2 + sub must fit in the pinned viewport with the stage), and
  the stage clears the fixed header with `pt-[92px]`. Beat 1 carries **`LoadTrend`**, an
  animated capacity chart (line draws toward the 90% cap, clay→red crossover at the
  threshold, pulsing "96%" marker); `LoadTrendAuto` replays it via `useInView` in the
  static/mobile story.
- **LiveCapture rebuilt calm** — scroll-pin removed per direction; it auto-plays in view and
  loops. The panel uses **pre-laid ghost slots** (all capture slots render placeholders up
  front, `AnimatePresence` swaps ghost ⇄ content) so streaming never reflows the box —
  verified pixel-constant height through a full loop.
- **The six agents:** ① hero + header + loader (new loader sequence, live-typing hero card,
  satellite chips, entrance choreography) · ② Steps demos rebuilt · ③ Statement responsive
  hardening · ④ LiveCapture/FeatureCards slot min-height tiers · ⑤ marketing pages
  (FeaturePage, PageHero, FAQ, MemoryTimeline, FinalCTA, SiteFooter) · ⑥ inside app —
  AppShell, Sidebar, Topbar, MeetingRoom, TranscriptView, AgentSidebar, settings, plus a new
  `(app)/loading.tsx` skeleton. App tier stayed on the calm ~150 ms language per `CLAUDE.md`.
- **Responsive gate:** full-page probe at 320px and 390px (scroll the whole ~13,300px
  document in an iframe, measure max `scrollWidth`) — clean. Last two offenders fixed by
  hand: the Steps `RouteDemo` owner/shared rows now `flex-wrap`, and the relay static-story
  exchange card slims its padding/glyphs below `sm`.

## 2026-07-04 — responsive shell pass

- `AppShell` gained a mobile nav drawer; the meeting room's agent rail became a drawer on
  small screens; `SiteHeader` gained the mobile menu.
- Gotcha worth keeping: `MeetingRoom`'s negative margins must mirror `AppShell`'s padding —
  change one, change both.

---

## 2026-07-03 — the "4-July" pass

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

`web/` is the **full UI surface on mock data**: the public marketing site (landing + pricing +
feature/legal pages) **and** every authenticated screen from doc 20 (dashboard, meetings, room
+ agent sidebar, transcript, decisions, tasks, org, search, settings, billing, admin/ops).
Standalone Next.js 14 app in the `web/` subfolder (repo root `Reprise-AI` has capitals npm
rejects).

What it is **not** yet: wired. No Clerk, no Socket.io, no LiveKit, no Server Actions — every
screen renders from `src/lib/mock/data.ts` and auth is bypassed. `README.md` / `system.md` /
`reprise-docs/20-frontend-architecture.md` are the *target spec*; this `PROGRESS.md` is the
*actual state*; the route-by-route status table is `docs/PAGES.md`.

### Route groups (all built)
- `src/app/(marketing)/` — landing + pricing + features hub/pages + legal/company pages.
- `src/app/(auth)/` — `sign-in` / `sign-up` currently redirect to `/dashboard` (`TODO(auth)`
  markers show where Clerk goes back in).
- `src/app/(app)/` — the authenticated shell (see `docs/PAGES.md`), plus a route-group
  `loading.tsx` skeleton.
- `src/app/(admin)/` — `/admin` + `/ops` consoles. `src/app/api/` — `health` route handler.

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
                      in view (NO scroll-jacking), holds, then loops. Pre-laid ghost slots
                      keep the panel height pixel-constant while content streams in.
  <Statement>         "between meetings" — THE RELAY: a 4-beat scroll-scrubbed PinnedScene
                      (moment → ask → return → proof); a packet rides bezier arcs between
                      two agents, the LoadTrend capacity chart draws to its red 96% flag,
                      and the heading lives inside the pin (SceneHeading). Mobile/reduced
                      motion get a fully separate static story.
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
| `LiveCapture.tsx` | Self-contained auto-playing "in the room" capture demo — pre-laid ghost slots, constant panel height, loops in view; not scroll-pinned. | client |
| `Statement.tsx` | THE RELAY — 4-beat scroll-scrubbed `PinnedScene` with `SceneHeading` (heading inside the pin), bezier packet exchange between agents, `LoadTrend` capacity chart, and a separate `StaticStory` for mobile/reduced motion. | client |
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
- **Dev-server wedge:** a long-running `next dev` can wedge itself after a webpack cache error
  (`PackFileCacheStrategy … rename ENOENT … .pack.gz`) — symptom is EVERY route hanging (even
  curl times out) while the code is fine. Don't bisect your code first; restart the dev server.
- **Responsive proofing:** the reliable 320px check is a same-origin iframe probe (create a
  320px-wide iframe of `/`, scroll it end-to-end, assert `scrollWidth` never exceeds 320) —
  resizing a maximized Chrome window silently no-ops. Track down offenders with
  `el.style.width='min-content'` + `getBoundingClientRect` up the chain.

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

1. **Real plumbing** — Clerk auth (replace the `(auth)` redirects; `TODO(auth)` markers),
   Socket.io reducers for the agent sidebar, LiveKit in the room, Server Actions for writes.
2. **Test suites** — the Vitest + Playwright (incl. a11y) coverage the canon gates PRs on.
3. **Decide orphaned-component fate** — delete the 6 superseded files, or repurpose
   `LiveSimulation` as a product demo section.
4. **Commit the current pass** — everything since the 4-July pass is still uncommitted on
   `local-mytheus-rebuild`.

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
