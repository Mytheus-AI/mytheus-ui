# 4-July — Final UI Pass (execution plan for Fable)

> This is the last big UI change. Execute it end-to-end in `web/` (the `mytheus-ui`
> Next.js 14 app). Ship it "crazy" but **calm-crazy**: expressive, cinematic motion
> that still respects `prefers-reduced-motion`, mobile, and the token layer. Never
> hard-code hex — read the CSS custom properties (`--signal`, `--ink-*`, `--bg`,
> `--line`, etc.). Every landing interaction degrades to instant/opacity under
> reduced motion. TypeScript strict; no `any`. Quality gates at the bottom must pass.

## 0. North star + product truth (use this for all copy)

Mytheus (architecture codename NEXUS) = an **intelligent meeting-orchestration
platform** where **every participant gets a personal AI agent**, tuned to their
role/skills, that captures role-relevant notes, labels decisions/actions/conflicts,
and — the killer bit — **collaborates with other participants' agents across
meetings**, returning answers that are **sourced to the exact meeting**.

Six agents (never rename): `PersonalListenerAgent`, `QuestionAgent`,
`DecisionAgent`, `ActionAgent`, `ContextGapAgent`, `ProactiveAgent`.
Confidence rule: `>0.7` surface · `0.4–0.7` silent log · `<0.4` drop. Nothing is
committed without a **one-tap Confirm**. Priority color language is frozen:
**red = act now, yellow = attention, blue = info** (`--priority-*`). ProactiveAgent
fires workload warnings at **80% / 95%** capacity, plus conflict / stakeholder /
dependency alerts. Decision lineage is the `FOLLOWS_FROM` chain. Sources cite
`meeting_id + chunk_id + speaker`. (Grounded in `mytheus-docs/00`, `/08`, `/18`, `/20`.)

Work is organized in six parts:
1. Rebuild **"How it works"** (`Steps.tsx`) as a scroll-pinned sequential scene.
2. Rebuild **"Between meetings"** (`Statement.tsx`) as an enterprise workload scene.
3. Upgrade the **motion system** (new pinned/zoom primitives) and apply site-wide.
4. **Bypass sign-in** and **complete the authenticated app** (all doc-20 screens, mock data).
5. Build **all marketing/feature pages** the docs call for.
6. Write the **contributor `.md` docs** so others can pick this up.

---

## Part 1 — "How it works": one stage at a time, in place

**File:** `src/components/landing/Steps.tsx` (+ optional `src/components/landing/steps/` for stage visuals).

### The problem
Today it's a hover-driven row of 5 compact panels (`Carousel`). The heading is
"Make meeting follow-through **self-driving**." The five stages are
**Capture · Label · Confirm · Route · Remember**. The boxes "don't feel good."

### The new interaction (scroll-pinned sequential reveal)
Keep the eyebrow + heading + intro paragraph. Below it, the section **pins** (sticky)
for the duration of the five stages. As the user scrolls, the **same on-screen region**
stays put and the stage content swaps **Capture → Label → Confirm → Route → Remember**,
one at a time, each with a purposeful transition (not a plain crossfade). The viewport
does **not** jump; only the stage inside the pinned frame changes.

Layout of the pinned frame (desktop):
- **Left rail (≈36%)**: a vertical progress spine `01…05` with the flow names. The
  active stage is clay/filled; a clay progress line fills top→down tied to scroll.
  Clicking a stage scrolls to it (Lenis-friendly anchor).
- **Right stage (≈64%)**: the active stage's title + body + a **mini live demo**
  (see per-stage visuals). Min-height reserved so nothing reflows on swap.

Stage transition: outgoing stage exits up + scale 0.96 + blur; incoming enters from
below + scale 1.0, springed with `ease [0.16,1,0.3,1]`, ~0.5s. Number in the spine
ticks with a short odometer feel. At most one attention motion at a time.

Drive it with the new **`PinnedScene`** primitive (Part 3): it pins for
`stages.length` viewport-heights and yields `activeIndex` + local `progress`.

### Per-stage mini visuals (each ~self-contained, honest to the product)
1. **Capture** — live transcript lines type/stream in; one line resolves into a
   *role-relevant* note card (PersonalListenerAgent). Tokens: `Role-relevant notes`,
   `Live transcript`. No bot / no recording link.
2. **Label** — a transcript line gets chips snapping onto it: `Decision` (blue→clay),
   `Action item`, `Conflict` (red). Chips fly in and dock. DecisionAgent/ActionAgent.
3. **Confirm** — a Decision card with **Confirm / Edit / Dismiss**; a cursor taps
   Confirm, a check fills, "Saved to knowledge graph" ghost text. Enforce the
   no-silent-commit story. Token: `One-tap confirm`.
4. **Route** — the confirmed item routes: an owner avatar gets assigned, and an
   "shared with 2 who missed it" chip appears. Tokens: `Owner assigned`,
   `Shared with absentees`.
5. **Remember** — a decision chip slides from "Mon standup" into "Fri planning",
   showing cross-meeting memory (ContextGapAgent handoff). Tokens: `→ Next meeting`,
   `Cross-meeting memory`.

Reuse existing icons (`MicIcon`, `SortIcon`, `ShieldCheckIcon`, `SendIcon`, `LoopIcon`)
and the `CARDS` data (keep the array; extend each entry with an optional `visual`
renderer). Keep tone/tokens from the current copy.

### Fallbacks
- **Mobile (`< md`)** and **reduced motion**: no pin. Render the five stages as a
  clean vertical stack (the current mobile stack is fine — upgrade its styling to
  match), each with its mini visual shown statically (final frame). Use `Reveal`.

### Acceptance
- Scrolling advances exactly one stage at a time; the frame never visually jumps.
- Keyboard: spine items are focusable buttons that move the active stage.
- 60fps; no layout shift on swap (reserved min-height). Reduced-motion = static stack.

---

## Part 2 — "Between meetings": the enterprise workload scene

**File:** `src/components/landing/Statement.tsx` (+ `src/components/landing/between/` for parts).

### The problem
Today it's a thin two-orb exchange (`AgentNode` × 2 + `Exchange`) ending in one
sourced card ("Pricing was locked at $49…"). It reads flat. Replace with a
**visually rich, enterprise-context scene** that shows what Mytheus actually solves:
capacity/planning collisions caught by agents, answered with sourced history.

### Keep
- Eyebrow "Between meetings" + heading "Your agents don't stop at the meeting." +
  the intro paragraph. Keep the sourced-answer idea and the `mesh-field` framed card.

### The new scene (grounded in docs 08 + 18)
Scenario: **Q3 planning**, and the room proposes giving the pricing rework to Sarah.
Three beats animate as one choreographed moment inside the framed panel:

**Beat 1 — the trigger.** A transcript line: *"Let's put the pricing rework on Sarah for Q3."*
Your agent (QuestionAgent/ProactiveAgent) leans in.

**Beat 2 — the workload read (the hero visual).** A compact **team-capacity bar chart**
animates in — 5 teammates, horizontal clay bars growing to their utilization, with
ProactiveAgent's **95% warning** on Sarah highlighted red, 80% amber on one more.
Use honest mock numbers, e.g. `Sarah 96%`, `Marcus 61%`, `Aisha 74%`, `Diego 45%`,
`Priya 88%`. Bars grow via scroll/`CountUp`; the over-capacity bar pulses once (red).
Label it "Team capacity · this sprint". This is the "barcharts / workloads" the brief asks for.

**Beat 3 — the sourced context.** ContextGapAgent asks Sarah's agent for the prior
pricing decision; a **query pulse** travels across, and a **sourced answer card**
returns: *"Pricing was locked at $49 in the Q2 planning call — Sarah owns the rework."*
Footer chip: `Sourced · Q2 Planning · Apr 3` with a decision-lineage trail
`Q2 Planning → Q3 Planning` (FOLLOWS_FROM). Optionally a second micro-card:
a **dependency/conflict** flag ("Rework blocks the Q3 launch date").

### Visual language
- One framed `mesh-field grain` panel (keep). Inside: left = the workload bar chart
  card; right = the agent exchange + sourced answer. On mobile they stack.
- Bars, cards, pulses all read in the clay/signal palette from tokens. Motion:
  bars grow on enter, the query pulse fires once per in-view loop, sourced card
  `MaskReveal`s up. The 95% bar is the single red attention accent.
- Keep `ConnectedGraph` agent orbs as small identity glyphs for "Your agent" /
  "Sarah's agent", but subordinate them to the chart.

### Data
Add `mockTeamCapacity` and a `mockSourcedAnswer` to `src/lib/mock/data.ts` so the
scene is data-driven, not hard-coded in JSX.

### Acceptance
- Reads as one cause→effect story (propose → over-capacity caught → sourced history).
- Honest to the product (agents, 80/95 thresholds, sourced citation, lineage).
- Reduced motion: bars render at final width, pulses off, cards visible.

---

## Part 3 — Motion system upgrade (make the whole site cinematic)

**File:** extend `src/components/landing/motion.tsx` (keep every existing export).

Add these primitives, all `prefers-reduced-motion`-safe (no-op / instant), coarse-pointer-safe:

- **`PinnedScene`** — pins a section (sticky inner + tall outer spacer of
  `count × 100vh`) and provides `activeIndex` + `sceneProgress` (0..1) to a render
  prop. Powers Part 1. Signature:
  `PinnedScene({ count, children: ({ index, progress }) => ReactNode, className })`.
- **`ScrollScale`** (zoom) — scroll-linked scale as the element crosses the viewport.
  `from`/`to` scale (e.g. zoom-in 0.9→1 on enter; or zoom-out 1→0.92 on exit),
  springed. Use on hero art, section mockups, the Part-2 panel.
- **`StageSwitch`** — `AnimatePresence mode="wait"` directional swap (up+scale+blur
  out / up+scale in) keyed by `index`; the standard swap used in Part 1 and anywhere
  content replaces content in place.
- **`Sticky`** (optional helper) — simple sticky wrapper with an intro/outro fade for
  section headers that should hang while their content scrolls past.

Apply across the site (tasteful, not everywhere):
- **Hero**: gentle `ScrollScale` zoom-out on the hero art as you scroll away; keep
  existing filmstrip. Headline via `WordReveal` (already available).
- **Section entrances**: standardize on `ScrubReveal` for big statements, `Reveal`/
  `Stagger` for lists, `Parallax` for layered background art.
- **Mockups / cards** (`mockups.tsx`, feature pages): `Tilt` + `ScrollScale`.
- **Between sections**: let Lenis + `ScrollScale` create a subtle "camera push"
  from one section into the next. Don't overdo blur; one accent motion at a time.
- Keep `ScrollProgressBar`, logo wiggle/breathe, `Magnetic` CTAs.

Guardrails: no continuous heavy canvas on every section; pause off-screen animations
via `useInView`; never animate layout-affecting properties without reserved space.

---

## Part 4 — Bypass sign-in + finish the authenticated app

Auth is already **unwired**: `(app)/layout.tsx` uses `mockOrgContext`, routes are
open, only `(auth)/sign-in` and `sign-up` show `ComingSoon`. Finish the bypass and
build every screen the frontend doc (doc 20 §7) specifies, all on mock data.

### 4a. Route users straight into the app
- Point every "Get started" / "Log in" / "Start free" CTA at **`/dashboard`**
  (SiteHeader, Hero, FinalCTA, feature-page CTAs, pricing CTAs).
- Replace `(auth)/sign-in/page.tsx` and `sign-up/page.tsx`: either `redirect("/dashboard")`
  (server component) or a lightweight mock auth screen whose single button enters
  `/dashboard`. Remove the "Coming soon" auth dead-ends.
- Leave a `// TODO(auth): restore Clerk middleware + gate (app)/(admin) here` marker
  in `(app)/layout.tsx` and `(admin)/layout.tsx` so the real gate is easy to restore.

### 4b. Complete the screen inventory (doc 20 §7) — all RSC + mock data
Existing (polish to a consistent bar): `dashboard`, `meetings`, `search`, `settings`,
`billing`, `(admin)/admin`. **Build the missing ones:**
- `meetings/[meetingId]/room` — replace the stub with the **real meeting room**:
  video-grid mock (participant tiles), live-caption strip, in-meeting chat tab, and
  the **agent sidebar** (the centerpiece). Mock the Socket.io stream with a local
  ticker that emits `agent-stream`-style deltas → `agent-results` cards. Implement the
  frozen **9-section sidebar order**: My Notes · Suggestion (red/yellow/blue) ·
  Decision (Confirm/Edit/Dismiss) · New-task toast · Context-fill · Conflict banner
  (red, pinned top) · Workload warning (80/95) · Stakeholder suggestion · Dependency
  warning · Save-for-later. `"use client"`, calm animation discipline.
- `meetings/[meetingId]/transcript` — RSC transcript view: colored speaker labels,
  click-to-jump, in-page search over mock `transcript_chunks`.
- `meetings/[meetingId]` — meeting detail (pre/post): agenda, participants, outcomes.
- `decisions` — decision history + `FOLLOWS_FROM` lineage (mock).
- `tasks` — My Tasks (action_items assigned to me), Confirm/Complete with optimistic UI.
- `org` — org chart (departments/teams) from mock.
- `settings/profile`, `settings/integrations` (Calendar/Slack/Jira|Linear),
  keep `settings/billing`.
- `(admin)/ops` — internal ops console (cross-tenant support/flags/cost — mock,
  feature-flagged behind a simple constant).

Build each per the `web/CLAUDE.md` "Add a new authenticated screen" recipe: RSC by
default, compose `components/ui/` primitives, add `EmptyState` + `Suspense`, don't
re-resolve tenancy (it's in `OrgContext`). No real backend calls — extend
`src/lib/mock/data.ts` with the entities each screen needs
(`transcript_chunks`, `worklogs`, `agent_suggestions`, `departments`, `teams`,
`integration_connections`, `org chart`, capacity, sourced answers).

### 4c. Sidebar/nav
Ensure `components/app/Sidebar.tsx` lists every new route; add nav sections that match
the doc (Meetings, Decisions, Tasks, Org, Search, Settings, Admin). Wire breadcrumb/topbar.

### Acceptance
- From the landing page, a CTA lands you in `/dashboard` with zero auth friction.
- Every route in doc 20 §7 resolves to a real, styled screen (no 404, no "coming soon").
- The meeting room shows a working mock agent sidebar with the 9 sections and a
  Confirm flow that visibly "commits" only on click.

---

## Part 5 — Marketing + feature pages (build them all)

Per the saved plan `mytheus-feature-pages` and doc 20's `(marketing)` requirement.
All under `src/app/(marketing)/`, composed from `components/marketing/` + landing motion.
Reuse `PageShell`/`ComingSoon` patterns but these must be **real** pages, not stubs.

**Build:**
- `/pricing` — Free / Pro **$25/seat/mo** / Enterprise. Feature matrix from doc 18 §3
  (seats, included minutes/tokens, SSO/SCIM, residency, SLO 99.5/99.9/99.95). Honest.
- `/features` — hub: the personal-agent difference + the six-agent overview; links to each.
- `/features/personal-agent` — per-participant, role-tuned intelligence (PersonalListenerAgent + `get_user_context`).
- `/features/live-notes` — real-time personalized notes streaming (worklogs).
- `/features/smart-questions` — live question suggestions + priority language (QuestionAgent).
- `/features/decisions` — detect → confirm → lineage (DecisionAgent, FOLLOWS_FROM).
- `/features/action-items` — capture/assign/follow-up (ActionAgent, ActionFollowUpWorkflow).
- `/features/context-gaps` — cross-meeting agent collaboration (ContextGapAgent) — the #2 differentiator.
- `/features/proactive-insights` — conflict/workload/stakeholder/dependency (ProactiveAgent).
- `/features/transcription` — live captions <2s, diarization.
- `/features/search` — semantic search + RAG **with citations**.
- `/features/knowledge-graph` — org memory (Person·Meeting·Decision·Action·Topic).
- `/features/integrations` — Google Calendar, Slack, Jira/Linear (R8 guardrail).

**Market by benefit, not by internal class names** (say "Smart questions", not
"QuestionAgent"). Each feature page: hero (WordReveal), a scroll-scaled product
visual/mockup, 2–3 benefit blocks, an honest capability note, and a CTA → `/dashboard`.

**Wire nav:** expand `SiteHeader` with a Product/Features menu and add a Pricing link;
expand the `SiteFooter` "Product" column to list the feature pages + Pricing. Keep the
existing `/enterprise`, `/security`, `/students`, `/blog`, `/careers`, legal pages.

---

## Part 6 — Contributor docs (`.md`s so others can build on this)

`web/` already has `CLAUDE.md`, `README.md`, `design.md`, `LANDING.md`, `PROGRESS.md`,
`system.md`. **Don't duplicate `CLAUDE.md`.** Create a `web/docs/` set and refresh the
top-level README to point at it:

- `web/docs/DESIGN-SYSTEM.md` — token layer (`--signal`, `--ink-*`, `--bg`, `--line`,
  `--priority-*`, radius), the `components/ui/` primitives + props, the priority color
  language, dark-mode/theming via token swap. How to add a component.
- `web/docs/MOTION.md` — the motion language + a **catalog of every `motion.tsx`
  primitive** (Reveal, Stagger, ScrubReveal, Parallax, Float, WordReveal, MaskReveal,
  Magnetic, Marquee, Tilt, CountUp, ScrollProgressBar, **PinnedScene, ScrollScale,
  StageSwitch**) with when-to-use, props, and the reduced-motion contract. Document
  Lenis smooth-scroll and the "calm, one accent at a time" rule.
- `web/docs/PAGES.md` — the full route map: every `(marketing)`, `(app)`, `(admin)`,
  `(auth)` route, its render mode, data source (mock today → which `/bff` or service
  endpoint later, per doc 20 §7), and status.
- `web/docs/MOCK-DATA.md` — what lives in `src/lib/mock/data.ts`, the entity shapes,
  and the swap-to-real-API path (Server Actions → `api-gateway`/`bff`, per `web/CLAUDE.md`).
- `web/docs/CONTRIBUTING.md` — setup, scripts (`pnpm dev/build/lint/typecheck/test`),
  the RSC-first + Server-Action conventions, naming authority (`mytheus-docs/_canon`),
  the quality gates, and the no-`Co-Authored-By` commit rule.
- Update `web/README.md` intro to link the above and `PROGRESS.md` to note this pass.

Keep the house doc style: plain-text headers, no emojis, no em-dashes, relative links.

---

## Global execution notes

- **Branch:** work on the current `local-mytheus-rebuild` branch (already has the
  uncommitted logo + landing work). Group commits by part; conventional commits
  (`feat:`, `refactor:`, `docs:`); **no `Co-Authored-By` footer** (repo rule).
- **Naming authority:** service/topic/entity names are frozen in `mytheus-docs/_canon`.
  Never invent or rename one in the UI.
- **Tokens only:** no raw hex in components; read CSS custom properties.
- **Client boundary:** keep `"use client"` leaf-ward; only the meeting room, sidebar,
  captions, and interactive/motion islands are client. Don't drag the heavy bundle
  onto the dashboard.
- **Accessibility is a gate:** keyboard nav for the pinned spine, the sidebar, and
  menus; focus order; priority-strip contrast in light + dark.

## Quality gates (must pass before "done")
1. `pnpm lint` — clean.
2. `pnpm typecheck` (`tsc --noEmit`) — clean, no new `any`.
3. `pnpm build` (`next build`) — succeeds.
4. Manual: every marketing + app route resolves (no 404 / no "coming soon"); CTAs
   reach `/dashboard`; Part 1 advances one stage at a time without a viewport jump;
   Part 2 tells the propose→over-capacity→sourced story; reduced-motion renders every
   scene as calm static frames; mobile layouts hold.
5. Docs: the five `web/docs/*.md` exist and match the shipped routes/primitives.

---

## Appendix A — exact copy & mock data (zero ambiguity)

One continuous story threads Parts 1 and 2: **a Q2 pricing decision that resurfaces
in Q3 planning.** Use these exact strings and numbers.

### A1. Part 1 stages — copy + demo script
Keep the existing `CARDS` titles/bodies/tokens; add a `demo` script per stage:

| # | Flow | Title | Body | Tokens | Mini-demo script |
|---|------|-------|------|--------|------------------|
| 01 | Capture | Every word, captured | No bot, no recording link — just live, role-relevant notes. | `Role-relevant notes`, `Live transcript` | Transcript streams: **Marcus:** "Can we still hit the April launch if pricing slips?" → resolves to a note card: *"Launch at risk if the pricing decision slips past April."* |
| 02 | Label | Decisions, sorted | Decisions, action items, and conflicts labeled the moment they're said. | `Decision`*, `Action item`*, `Conflict`* | Line: **Sarah:** "Okay — lock the price at $49, and I'll own the rework." Chips dock: `Decision` on "lock the price at $49", `Action item` on "own the rework". |
| 03 | Confirm | Never committed silently | Nothing is saved or assigned without your one-tap confirm. | `One-tap confirm` | Decision card *"Lock pricing at $49 for Q3"* with **Confirm / Edit / Dismiss**; cursor taps Confirm → check fills → ghost text *"Added to the knowledge graph."* |
| 04 | Route | Sent to the right people | Assigned to an owner and shared with anyone who missed it. | `Owner assigned`, `Shared with absentees` | Owner avatar → **Sarah**; chip *"Shared with 2 who missed it — Priya, Diego."* |
| 05 | Remember | Carried to the next meeting | A decision Monday becomes context your agents reuse Friday. | `→ Next meeting`, `Cross-meeting memory` | Chip *"Pricing locked at $49"* slides from **Q2 Planning · Apr 3** into **Q3 Planning · Jul 2**. |

`*` = clay-toned token.

### A2. Part 2 scene — copy
- Eyebrow: **Between meetings** · Heading: **Your agents don't stop at the meeting.** (unchanged)
- Trigger transcript line: **"Let's put the pricing rework on Sarah for Q3."**
- ProactiveAgent flag (red): **"Sarah is at 96% — over capacity this sprint."**
- Chart title: **Team capacity · this sprint**
- Sourced answer card: **"Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework."**
- Sourced footer chip: **Sourced · Q2 Planning · Apr 3**
- Lineage trail: **Q2 Planning → Q3 Planning**
- Dependency micro-card (amber): **"Pricing rework blocks the Q3 launch date."**

### A3. Mock data to add in `src/lib/mock/data.ts`
```ts
export type CapacityState = "over" | "near" | "ok";
export type TeammateCapacity = { name: string; util: number; state: CapacityState };

// util = % utilization this sprint; state drives bar color (over=red, near=amber, ok=clay)
export const mockTeamCapacity: TeammateCapacity[] = [
  { name: "Sarah",  util: 96, state: "over" },
  { name: "Priya",  util: 88, state: "near" },
  { name: "Aisha",  util: 74, state: "ok" },
  { name: "Marcus", util: 61, state: "ok" },
  { name: "Diego",  util: 45, state: "ok" },
];

export type SourcedAnswer = {
  quote: string;
  source: { meeting: string; date: string };  // human-readable; maps to meeting_id later
  lineage: string[];                            // FOLLOWS_FROM chain, oldest → newest
};

export const mockSourcedAnswer: SourcedAnswer = {
  quote: "Pricing was locked at $49 in the Q2 planning call — Sarah already owns the rework.",
  source: { meeting: "Q2 Planning", date: "Apr 3" },
  lineage: ["Q2 Planning", "Q3 Planning"],
};
```
Thresholds are honest to the docs: `state` mirrors ProactiveAgent's **80% (near) / 95%
(over)** capacity warnings. Bar color reads from tokens (`--priority-high` red for
`over`, `--priority-medium` amber for `near`, `--signal` clay for `ok`).

### A4. Meeting-room agent-sidebar mock (Part 4b)
Drive the sidebar from a local ticker that emits, in order (2–3s apart), then loops:
`My Notes` (worklog line) → `Suggestion` (blue) → `Decision` ("Lock pricing at $49",
Confirm/Edit/Dismiss) → `New task` toast (Sarah) → `Context-fill` ("Context added
from Sarah's agent — Q2 Planning") → `Conflict banner` (red, pinned: "Conflicts with
the Q3 launch date") → `Workload warning` ("Sarah at 96%") → `Stakeholder` ("Add
Priya — owns billing") → `Dependency` ("Rework blocks launch"). Confirm on the
Decision card is the only path that "commits" (visible check + "saved" state).

---

## Suggested order (each an independently shippable commit)
1. Part 3 primitives (`PinnedScene`, `ScrollScale`, `StageSwitch`) — everything else uses them.
2. Part 1 (`Steps.tsx`) rebuild.
3. Part 2 (`Statement.tsx`) rebuild + mock capacity data.
4. Part 4a bypass + Part 4b/4c app screens + mock-data extensions.
5. Part 5 marketing/feature pages + nav/footer wiring.
6. Part 3 site-wide motion application pass (hero zoom, section cameras).
7. Part 6 docs + README/PROGRESS refresh.
8. Final quality-gate pass.
