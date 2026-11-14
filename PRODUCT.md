# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a team member who sits in many meetings: an individual contributor or manager inside an organization who needs to leave each meeting with the notes, decisions and tasks that matter to their own role, without taking them by hand.

Secondary audiences that the product also serves (present in the repo, not the first priority for design decisions):

- People who run meetings and are accountable for follow-up.
- Workspace admins, who manage members, seats, billing and policies in the Workspace console (`/workspace/*`).
- Platform staff, who use the separate ops console (`/ops`).
- Students and small groups (a `/students` plan with a verification flow).

## Product Purpose

Mytheus is a multi-tenant meeting platform in which every participant gets a personal AI agent, called a Myte. The agent attends that person's meetings, captures role-relevant notes, suggests questions in real time, and surfaces detected decisions, action items and conflicts. What it captures carries forward, so a decision in one meeting is context in the next.

Success for the primary user: they leave a meeting with an accurate record of what was decided and what they owe, they confirmed it themselves, and they can find it again later.

Mytheus is an academic project, built deliberately to the standard of a complete end-to-end SaaS. It is pre-launch.

## Positioning

- Every participant has their own agent, not one shared bot per call. Each agent works from its owner's role and context.
- Agents collaborate across meetings: the record is cumulative (a per-organization knowledge graph), so Monday's decision is Friday's context.
- The agent never writes silently. Detected decisions and actions are proposals until the user confirms them; only then are they persisted.
- Mytheus hosts its own meetings (video, live captions, agent sidebar) and also reaches meetings held elsewhere: a Chrome extension covers meetings run in Chrome on other services such as Google Meet.

## Operating Context

- In a meeting: the meeting room (LiveKit video, live captions, in-meeting chat) with the agent sidebar streaming cards the user can confirm.
- Between meetings: Home, Inbox (notifications, updates you owe, detections to review), Meetings, My work (tasks, promises, updates), Decisions, People, personal Settings.
- Listening without attending: per meeting the user chooses attend, agent listens, or skip; the agent can interrupt live and sends an evening digest.
- Outside the app: integrations for scheduling and follow-up. The feature copy names Google Calendar, Slack, and one project tracker (Jira or Linear) per workspace. The Chrome extension handles meetings on other browser-based services.
- Organizations are tenants. Sign-in and organization membership are handled by Clerk.

## Capabilities and Constraints

Confirmed functionality (wired to real data): Clerk auth, dashboards and lists read through `api-gateway`/`bff`, Server Actions for every write, Socket.io to `realtime-gateway` for captions and agent output, LiveKit media in the meeting room.

Constraints future work must preserve:

- The server decides what is true; the client decides how it appears. This repo owns no backend data and holds no secrets.
- `org_id` is always server-derived. The browser never sends it, filters by tenant, or acts as a tenancy boundary.
- No silent writes: agent decisions and actions require an explicit user Confirm.
- The WebSocket carries no durable truth. A dropped connection loses nothing; state re-hydrates from the server.
- Live captions render within 2 seconds with no layout shift.
- Priority colour meaning is frozen: red acts now, amber needs attention, blue informs.
- Service, topic and entity names are frozen in the `mytheus-docs` `_canon/` and are never renamed locally.

Terminology: the product is Mytheus (never "NEXUS" in copy, which is an internal codename). A user's agent is a Myte. Wire names such as `agent-stream`, `agent-results`, `decisions`, `actions`, `meeting_id` are used verbatim.

Undecided or unverified:

- The exact, complete list of integrations. The owner states there are several; the repo's feature copy names Google Calendar, Slack, Jira and Linear.
- The Chrome extension's scope (which services beyond Google Meet, and what the agent can do there). It is stated by the owner and is not part of this repository.
- Whether the plans and prices on `/pricing` are committed.

## Brand Commitments

- Name: Mytheus. Wordmark component: `src/components/site/Wordmark.tsx`. Brand mark: `LogoMark` in `src/components/Logo.tsx`.
- Signature line, in use in the site title and hero: "Every meeting, on repeat."
- Voice: plain, specific, sentence case, active voice. Say what things do for the user. Buttons say exactly what happens and the resulting toast uses the same verb.
- Copy rules already binding in the repo: no em or en dashes in visible copy, no emoji, sample numbers and sample people are illustrative.
- `docs/DESIGN-ONELINE.md` is the current design contract and wins over older design docs in the repo.

## Evidence on Hand

- Real: the working product itself (routes listed in `docs/PAGES.md`), the feature registry in `src/lib/marketing/features.ts`, and the marketing, pricing, security and legal pages.
- Absent, and not to be fabricated: customers, pilots, testimonials, usage metrics, benchmarks, press, and security certifications. People and numbers shown in product visuals are samples.

## Product Principles

1. The user confirms; the agent proposes. Anything the agent detected must read as proposed until the user acts.
2. Each person's view is their own. The product is organized around what one participant needs from a meeting, not around a shared transcript.
3. What was said carries forward. Surfaces should make the link between a past decision and present work visible.
4. Claim only what is true. No invented integrations, certifications, customers or prices.
5. Build it as a complete product. Every state (empty, loading, error, offline, reconnecting) is designed, because the standard is a real SaaS.

## Accessibility & Inclusion

Accessibility is a release gate, verified in Playwright with axe: keyboard-only navigation, focus order, visible focus, labelled controls, semantic headings, and AA contrast in both light and dark themes, including the priority colours. `prefers-reduced-motion` shows everything in its final state. Touch targets are at least 40px.
