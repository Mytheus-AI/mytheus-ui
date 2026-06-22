# `reprise-ui` — System Design

The deep technical reference for the **Reprise AI web-app**: the Next.js 14 App Router client that renders the meeting room, the per-participant agent sidebar, dashboards, and all client-facing screens. This document is the implementation-facing companion to the architecture canon; where they disagree, the canon wins.

**Canon references** (in the `reprise-docs` repo): `20-frontend-architecture.md` (the primary frontend spec), `03-container-architecture.md` (where web-app sits), `19-api-architecture.md` (the API surface), `11-security-architecture.md` and `06-multi-tenancy.md` (Clerk auth, `org_id`, JWT), `10-realtime-and-transcription.md` (server-side fan-out this client consumes), `09-rag-and-inference-serving.md` (the RAG/citation contract), and the frozen `_canon/` naming authority.

---

## 1. Purpose & bounded context

`reprise-ui` owns the **web-app container** and nothing else: everything that runs in the browser or in the Next.js server (RSC, route handlers, Server Actions). It specifies how the client renders Reprise AI, how it consumes the live and CRUD planes, and how the agent sidebar is built.

It does **not**:

- Rename any entity, topic, or service — those are frozen in the canon (`_canon/01-service-catalog.md`, `_canon/02-data-model.md`, `_canon/03-event-taxonomy.md`).
- Define the server-side fan-out (`realtime-gateway`, `agent-stream`, the Redis pub/sub backbone) — that is `10-realtime-and-transcription.md`. This repo **consumes** those contracts as a client.
- Define the `bff`'s screen-shaped endpoints' internal fan-out — that is the `bff` row in the service catalog. This repo specifies which `/bff/*` and direct service endpoints each screen calls.

The clean split: **the server decides what is true; the client decides how it appears.** Every durable fact arrives over a server contract; the client owns rendering, optimistic UI, animation discipline, and offline/reconnect resilience. The browser is **not** a tenancy boundary — it treats every response as already `org_id`-scoped.

## 2. Responsibilities

| Surface | What the UI does | Primary source |
| --- | --- | --- |
| **Meeting room** | LiveKit video grid (1–9 tiles, nominal 6), controls, screen share, pre-join device check, in-meeting chat, live captions, agent sidebar | `meeting-service` token, `realtime-gateway`, LiveKit SFU |
| **Agent sidebar** | Renders per-participant agent output (notes, suggestions, detected decisions, task toasts, context-fill, conflict banner, workload/stakeholder/dependency warnings); streaming token updates; Save-for-later queue | `agent-stream` / `agent-results` over Socket.io |
| **Live captions** | Interim-then-final captions within the < 2 s budget; interims mutable, never persisted | Socket.io from `realtime-gateway` |
| **Dashboards** | Upcoming meetings, open action items, recent worklogs, decision history + lineage, My Tasks, org chart | `bff` aggregate + `core-api` |
| **Search** | RAG passages + citations, FTS transcript search | `rag-service` `POST /api/v1/rag/query` + `search-service` |
| **Settings / billing** | Profile, integrations (Calendar/Slack/Jira\|Linear), plan/seats/usage/invoices | `identity-tenant-service`, `integration-service`, `billing-metering-service` via `bff` |
| **Admin consoles** | Tenant admin and internal ops (RBAC-gated, server-enforced) | `admin-ops-service` |

The sidebar **renders** these; it never decides them. Confidence gating (> 0.7 surface) happens in `agent-runtime-service`, so anything reaching the UI is already above threshold. The **decision/action confirmation rule is load-bearing**: the agent never silently writes — the card surfaces, the user clicks **Confirm**, and only then does `core-api` emit on the `decisions`/`actions` topic and `knowledge-graph-service` create the edge in `nexus_knowledge`.

## 3. Architecture

### 3.1 App Router & RSC-first rendering

The app is **React Server Components-first**. The default is a server component; a component opts into the client only when it needs interactivity, browser APIs, or a live subscription. This keeps the client bundle small (the dashboard ships first paint with almost no client JS) and pushes data fetching to the server where the Clerk session and `org_id` are already resolved.

| Rendering mode | Used for | Why |
| --- | --- | --- |
| **RSC (default, server)** | Dashboard, transcript view, decision history, My Tasks, org chart, admin/tenant consoles, integration & billing pages | Data lives behind `bff`/services; render server-side with the user's JWT, stream HTML, ship zero client JS for static parts |
| **`"use client"`** | Meeting room, agent sidebar, in-meeting chat, live captions, RAG context panel, optimistic forms | Needs Socket.io/LiveKit subscriptions, local interaction state, animation |
| **Server Actions** | Confirm/edit/dismiss a decision, assign/complete an action, dismiss/ask/save a suggestion, save integration settings, profile edits | Mutations run server-side with the session; call the canonical endpoint through `bff`/`api-gateway`, then `revalidateTag()` the affected RSC cache tag; degrade gracefully without client JS |
| **Route handlers (`app/api/*`)** | Clerk session helpers, LiveKit token proxy to `meeting-service`, health checks | Thin server endpoints; no business logic |

### 3.2 Streaming

`Suspense` boundaries let a slow `bff` aggregate stream in progressively rather than blocking the shell. RSC HTML streams to first paint; client islands (the meeting room's heavy LiveKit + Socket.io bundle) load only on the route that needs them via dynamic import.

### 3.3 Route groups & org context

Route groups separate auth state, layout shells, and tenancy context without leaking path segments into the URL: `(marketing)`, `(auth)`, `(app)`, `(admin)`. The **`(app)/layout.tsx` is the single place** the org/tenant context is established for authenticated screens — it reads the Clerk session, resolves the active `org_id`, resolves per-tenant theming and locale from `tenant_settings`, and renders the persistent nav shell. Children inherit a typed `OrgContext` so no screen re-derives tenancy.

### 3.4 Server Actions as the write chokepoint

Each Server Action calls the canonical service endpoint through `bff`/`api-gateway` (never a service directly), then `revalidateTag()`. This keeps the `org_id`-injection chokepoint on the only path the browser can write through, and means a no-JS or slow-JS client can still confirm a decision via a progressively-enhanced form.

## 4. Tech stack (with versions)

| Concern | Choice | Version |
| --- | --- | --- |
| Framework | Next.js (App Router, RSC, Server Actions) | 14.x |
| UI runtime | React | 18.x |
| Language | TypeScript (strict) | 5.x |
| Auth SDK | `@clerk/nextjs` | latest 5.x |
| Real-time (non-AV) | `socket.io-client` | 4.x |
| Media | `@livekit/components-react` + `livekit-client` | latest |
| Styling | TailwindCSS | 3.x |
| Component primitives | shadcn/ui (copy-in) over CSS custom properties | — |
| Async client cache | TanStack Query (`@tanstack/react-query`) | 5.x |
| Ephemeral state | Zustand | 4.x |
| Motion | Framer Motion | 11.x |
| Unit/component test | Vitest + Testing Library | latest |
| E2E + a11y | Playwright | latest |
| Lint/format | ESLint + Prettier | latest |
| Errors/observability | Sentry browser SDK, OpenTelemetry browser | latest |
| Package manager / runtime | pnpm / Node 20+ | — |

## 5. How it talks to the backend

### 5.1 REST through api-gateway → bff

The client knows exactly two origins: the `api-gateway` HTTPS origin and the `realtime-gateway` WSS origin. The `bff` fan-out to 8+ services is invisible to the client — this is what lets the service mesh evolve without a single frontend change.

- **RSC reads** fetch from the `bff` **screen-shaped endpoints** (`/bff/*`, owned only by `bff`) — e.g. `GET /bff/dashboard`, `GET /bff/meeting-room/:id` returns the meeting, participants, the user's worklog, open suggestions, and presence in one composite payload. Or directly from a read endpoint the catalog assigns to `core-api`/`rag-service`/`search-service`. They run server-side with the forwarded JWT; `api-gateway` injects `org_id`.
- **Client mutations** go through Server Actions or typed client calls, both terminating at `api-gateway` (`PATCH /api/v1/worklogs/:id`, `POST /api/v1/decisions/:id/confirm`, …). The public REST surface is `/api/v1/...`, resource-oriented, `snake_case` JSON mirroring column names, cursor-paginated, RFC 7807 typed errors with a stable `code` enum, `Idempotency-Key` on mutations.
- **Caching:** RSC fetches use Next.js `fetch` cache tags keyed by resource (`meeting:{id}`, `tasks:{userId}`); Server Actions `revalidateTag` after a write. There is **no** client-side duplication of the `bff` read-through Redis cache — the client trusts the server's freshness.

Key endpoints this UI calls (all `/api/v1`, via `api-gateway`):

- `GET /users/me`, `GET/PUT /users/:id/profile`, `GET /orgs/:id`, `GET /orgs/:id/teams`, `GET/POST /departments`
- `POST/GET /meetings`, `GET /meetings/:id`, `POST /meetings/:id/token` (LiveKit mint, p95 < 250 ms), `GET /meetings/:id/transcript`, `.../chat`
- `GET /worklogs`, `GET /decisions`, `POST /decisions/:id/confirm`, `GET /actions`, `POST /actions/:id/confirm`, `GET/PATCH /suggestions`, `GET /collaborations`
- `POST /rag/query`, `GET /search`, `POST /ingest/document`
- `GET /billing/subscription`, `GET /billing/invoices`, `GET /plans`, `GET /usage`
- `GET/PATCH /notifications` (the durable read side of the sidebar alert stream)
- `GET/POST /admin/tenant/*`, `GET/POST /admin/ops/*` (RBAC-gated)

The **TypeScript API client is generated from the OpenAPI 3.1 spec**, so wire drift between client and server is structurally impossible.

### 5.2 WSS to realtime-gateway

The browser holds exactly two long-lived connections, matching the two server planes:

| Transport | Library | Carries | Endpoint |
| --- | --- | --- | --- |
| Non-AV real-time | Socket.io client | live captions, agent sidebar output, streamed `agent-stream` tokens, presence, in-meeting chat | `realtime-gateway` (WSS via `api-gateway`) |
| Media | LiveKit React client | audio/video tracks, screen share, room events | LiveKit SFU |

**Socket.io rooms are keyed by `meeting_id`.** The client joins the `meeting_id` room; fan-out across `realtime-gateway` instances happens server-side over the `nexus:{org_id}:pubsub:meeting:{meeting_id}` Redis pub/sub channel — invisible to the client. The sidebar subscribes to two channels:

- `agent-stream` token deltas — disposable, progressive text (the `AgentStreamDelta` envelope).
- `agent-results` final messages — the durable card (the `AgentResult` schema).

Client rules that mirror the server contract:

1. **Deltas are throwaway.** If the client misses every delta, the final `agent-results` message still renders the complete card. A missing delta is never data loss.
2. **Correlation-keyed drafts.** Deltas carry a correlation id; the client accumulates them into a draft card keyed by that id and swaps to the final on `agent-results`.
3. **Backpressure-aware.** Under a slow connection, `realtime-gateway` drops `agent-stream` deltas first; the client receives the final card slightly later with no progressive animation. Captions and confirmed outputs are never dropped.

**Reconnect** is automatic on both transports: Socket.io uses exponential backoff and re-joins the room; on reconnect the client re-hydrates caption/agent/transcript history from `core-api` (finals are durable) so a dropped socket loses no transcript or confirmed output. The LiveKit token is re-minted on reconnect via `app/api/livekit-token/route.ts`.

## 6. Auth & multi-tenancy

- **Clerk** is the identity provider. `<ClerkProvider>` wraps the root layout; middleware protects `(app)` and `(admin)` route groups. The front-channel issues a short-lived session JWT carrying the `org` claim; every backend request presents it as a bearer token.
- The client **never injects or trusts `org_id` from the browser.** `api-gateway` verifies the JWT signature against Clerk's cached JWKS, extracts the `org` claim → `org_id`, and injects it server-side; the service tier re-verifies. The UI displays the active org but cannot widen its own scope.
- **Org switching** re-authenticates through Clerk; it never mutates a header. The active org comes from the Clerk session, never from app state.
- **RBAC gating** on `(admin)` routes is enforced server-side (fail-closed at the gateway/service). The client hides/disables admin affordances as a UX courtesy only.
- Because tenancy is enforced at every server layer (RLS, namespaced Redis, per-tenant Qdrant, org-partitioned `nexus_knowledge`), the client receives only its tenant's data and **never filters by tenant itself** — removing a whole class of client-side leakage bugs.

> The single most important frontend security property: **the browser is not a tenancy boundary.** The client treats every response as already-scoped and the gateway as the only place `org_id` is decided.

## 7. State management & data fetching

A layered model keeps server truth and client UI state cleanly separated:

| Layer | Tool | Owns |
| --- | --- | --- |
| Server cache | RSC fetch cache (Next.js) | server-rendered reads; tag-based revalidation on Server Action writes |
| Async client cache | TanStack Query | client reads/mutations of CRUD data; query keys mirror resources (`["tasks", userId]`, `["meeting", id]`); optimistic updates with rollback |
| Ephemeral UI state | Zustand | sidebar collapse, draft streaming cards, toast queue, device-check state |
| Live event state | Socket.io → Zustand | captions, agent cards, presence reduce into the sidebar store |
| Auth/session | Clerk | user/session, active `org_id` — source of identity, never stored in app state |

**Reconciliation rule:** a streamed `agent-results` card writes into the Zustand live store (immediate render) **and** is reconciled against the TanStack Query cache for the relevant list (a confirmed decision invalidates `["decisions", meetingId]`). The client never invents data the server has not produced; optimistic UI (e.g. marking an action complete) always carries a rollback path keyed on the server's response.

## 8. Real-time UX

- **Live captions** render within the **< 2 s** caption SLO, interim-then-final, without layout shift. Interims are mutable and never persisted (enforced server-side by `transcription-service`).
- **Agent sidebar** renders LLM output **as it streams** — a suggestion or detected decision materializes progressively rather than popping in fully formed. Target: p95 < 4 s speech→sidebar (interactive class). Streaming text appends without layout thrash (reserved min-height per card).
- **Priority color language (frozen):** red (`--priority-high`, priority 1, act now), yellow (`--priority-medium`, priority 2, attention), blue (`--priority-low`, priority 3, info). The **red conflict banner** pre-empts and always renders above all other cards; the client pins it to the top regardless of arrival order.
- **Animation discipline — calm, not flashy** (a behavioral contract): cards fade+slide in over ~150 ms, never bounce/flash/shake; at most one attention-grabbing motion at a time (the conflict banner's single subtle pulse); toasts auto-dismiss after a fixed dwell and queue rather than stack chaotically; `prefers-reduced-motion` degrades all entrances to an instant opacity-only transition. Motion is enforced with a small set of shared Framer Motion variants (`cardEnter`, `bannerPulseOnce`, `toastDwell`) so no feature component invents its own motion.
- **Save-for-later** sets `agent_suggestions.status = 'Save-for-later'` (durable in Postgres), so the queue is re-hydrated when the user opens their **next** meeting room — a question parked in Monday's standup reappears in Wednesday's planning.

## 9. Performance

Budgets anchored to the SLOs the canon imports:

| Surface | Budget | Technique |
| --- | --- | --- |
| Dashboard FCP | < 1.5 s mid-tier device | RSC streaming, minimal client JS, Cloudflare-cached assets |
| Route JS (non-meeting) | < 100 KB gzipped | RSC default, dynamic-import client islands |
| Live caption render | within < 2 s SLO | Socket.io, render without layout shift |
| Streamed agent token | p95 < 4 s speech→sidebar | progressive append |
| Video grid | 60 fps with 6–9 tiles | LiveKit adaptive simulcast; pause off-screen tiles |

Techniques: **RSC is served Cloudflare/CDN-cached** at the edge; route-level code splitting (the heavy LiveKit + Socket.io bundle loads only on the meeting room, not the dashboard); `next/image` through Cloudflare for avatars/assets; `Suspense` boundaries for progressive aggregate streaming; **virtualized lists** for the transcript view (a meeting yields up to ~360 finals) and long decision/task lists. **Core Web Vitals targets:** LCP < 2.5 s, INP < 200 ms, CLS < 0.1.

**Mobile responsive — the bottom-sheet sidebar.** Below the `lg` breakpoint the agent sidebar is a **bottom sheet** (drag-up over the video grid), not a side rail. Collapsed, it shows a peek handle with unread counts and the conflict indicator; a red conflict banner auto-expands the sheet a notch. Same priority language, streaming, Save-for-later, and frozen section order apply — only the container changes, so there is no second implementation of the hardest screen.

## 10. Accessibility & i18n

- **Accessibility:** shadcn/ui primitives ship accessible-by-default (focus-trapped `Modal`, labeled `Input`, ARIA-correct `Badge`/`Avatar`); `prefers-reduced-motion` honored throughout. Verified in the Playwright E2E suite — keyboard-only navigation of the meeting room and sidebar, focus order, and contrast of the priority strip in both light and dark token sets — not left to manual spot-checks.
- **i18n:** locale resolves from `tenant_settings.default_locale` at the `(app)/layout.tsx` boundary (the same boundary that resolves theming and `org_id`), so every screen renders in the tenant's default locale without per-screen wiring; user-level overrides layer on top. Strings are externalized rather than inlined.

## 11. Security

- **No secrets client-side.** Only `NEXT_PUBLIC_*` values reach the browser bundle. Clerk secret key, Sentry auth token, LiveKit/Deepgram/service credentials live server-side (in Next.js server context or backend services). The LiveKit token route proxies the mint and holds no LiveKit secret.
- **CSP.** A strict Content-Security-Policy is set (via `next.config.mjs` headers / middleware) restricting `script-src`, `connect-src` (limited to the `api-gateway` HTTPS origin, the `realtime-gateway` WSS origin, the LiveKit SFU, Clerk, and Sentry), `frame-src`, and `img-src`; nonce-based for inline scripts where required.
- **XSS.** React escapes by default; `dangerouslySetInnerHTML` is forbidden except for vetted, sanitized server-rendered content. Citation/agent output is treated as text, never HTML.
- **Trust model.** The client treats every response as already `org_id`-scoped; `404` (not `403`) is returned for cross-tenant access so existence stays tenant-confidential — the UI surfaces it as "not found."

## 12. Dev practices

- **TypeScript strict** everywhere; no `any` without justification.
- **ESLint + Prettier** enforced in CI; conventional-commits message format.
- **Trunk-based development** with short-lived branches and mandatory PR review.
- **TDD with Vitest** — tests before implementation for primitives, hooks, store reducers, and the sidebar streaming logic.
- **Commits in this project must NOT include a `Co-Authored-By` footer.**
- Names (services, topics, entities) come from the `reprise-docs` `_canon/` authority — never invented locally. Frozen identifiers (`agent-stream`, `transcript-chunks`, `agent-results`, the `nexus:{org_id}:` Redis prefix, `nexus_knowledge`) are used verbatim.

## 13. CI/CD

GitHub Actions pipeline on every PR:

1. **lint** (ESLint) + **format check** (Prettier)
2. **typecheck** (`tsc --noEmit`)
3. **test** (Vitest unit/component, with coverage)
4. **build** (`next build`)
5. **E2E** (Playwright, incl. a11y) on the built app
6. **preview deploy** per PR (Vercel preview or container preview environment), commented on the PR for review.

Production deploys on merge to the default branch — **Vercel** (the RSC-native path) or a container deploy (Next.js standalone output in a Docker image to Kubernetes) consistent with the platform's compute substrate. The OpenAPI breaking-change gate (`oasdiff`) lives in the backend repos; this repo regenerates its TS client from the published spec.

## 14. Observability

- **Sentry browser SDK** — errors, releases, and source maps (uploaded in CI). Errors carry the `trace_id` so support can pivot from a client-reported error to the exact request.
- **Web Vitals** — LCP, INP, CLS reported from the client for the Core Web Vitals targets in §9.
- **OpenTelemetry browser** — client spans correlated with the W3C trace context propagated through `api-gateway`, so a slow screen can be traced end-to-end across the `bff` fan-out.

## 15. Folder / module boundaries

- `app/` — routes only (RSC pages, layouts, route handlers, Server Actions). No business logic beyond orchestration; mutations call the canonical endpoint through `bff`/`api-gateway`.
- `components/ui/` — the **only** visual vocabulary: `Button`, `Input`, `Modal`, `Card` (with optional `priorityStrip`), `EmptyState`, `Avatar`, `Badge`. Feature components compose these and never introduce ad-hoc styling.
- `components/meeting/`, `components/sidebar/` — feature components for the room and the agent sidebar.
- `lib/api/` — the generated TS client + the single gateway base URL. No component holds a service URL.
- `lib/realtime/` — `SocketProvider` (joins the `meeting_id` room) and `LiveKitRoom` wrappers; both wrap the meeting-room subtree only.
- `lib/query/` — TanStack Query keys and client. `lib/store/` — Zustand stores. `lib/motion/` — the frozen Framer Motion variants.
- The **token layer** (`app/globals.css` CSS custom properties → `tailwind.config.ts`) is the single source of visual truth; components read tokens, never raw hex, so dark mode and per-tenant theming flip by swapping a token set.
