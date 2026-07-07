# CLAUDE.md

This is `mytheus-ui`, the Next.js 14 web frontend of Mytheus. The one thing to keep in mind on every change: the server decides what is true; the client only decides how it appears. This repo owns no backend data, holds no secrets, and reaches the backend only through `api-gateway`/`bff` (REST) and `realtime-gateway` (WSS).

Current state vs this spec: the full UI surface is built on mock data (marketing site + every authenticated screen), but the plumbing this document describes — Clerk, Socket.io, LiveKit, Server Actions, TanStack/Zustand — is not wired yet; auth is bypassed and everything reads `src/lib/mock/data.ts`. The actual state is tracked in `PROGRESS.md`, the route-by-route status in `docs/PAGES.md`, and the practical setup (npm, not pnpm, for now) in `docs/CONTRIBUTING.md`. The rules below still govern every change; the recipes apply as each piece of plumbing lands.

## Repo at a glance

- What it is: the web-app container of Mytheus, a multi-tenant meeting-orchestration SaaS where every participant gets a personal AI agent. This repo renders the meeting room (LiveKit video, live captions, the agent sidebar), dashboards, search, settings, billing, and admin consoles.
- Tier: edge/client tier. Everything here runs in the browser or in the Next.js server (RSC, route handlers, Server Actions).
- What it owns: rendering, optimistic UI, animation discipline, reconnect/offline resilience, and the client-side composition of server contracts.
- What it must NEVER do:
  - Own or persist backend data. There is no database in this repo.
  - Hold a secret. Only `NEXT_PUBLIC_*` values may reach the browser bundle.
  - Talk to a backend service directly. All REST goes through `api-gateway` -> `bff`; all live traffic goes through `realtime-gateway`. The client knows exactly two backend origins (plus the LiveKit SFU host and Clerk).
  - Filter by tenant, inject `org_id`, or treat the browser as a tenancy boundary.
  - Rename any service, topic, or entity. Names are frozen in the `mytheus-docs` `_canon/`.

## Architecture orientation

Two data planes, two origins:

- REST (control/CRUD plane): `web-app -> api-gateway -> bff -> services`. RSC reads fetch `bff` screen-shaped endpoints (`/bff/*`, e.g. `GET /bff/dashboard`, `GET /bff/meeting-room/:id`) or catalog read endpoints assigned to `core-api`/`rag-service`/`search-service`. Writes go through Server Actions (preferred) or typed client calls, all terminating at `api-gateway` on the public `/api/v1/...` surface (resource-oriented, `snake_case` JSON mirroring backend columns, cursor-paginated, RFC 7807 typed errors, `Idempotency-Key` on mutations). The `bff` fan-out to 8+ services is invisible to the client.
- WSS (live plane): Socket.io to `realtime-gateway` carries live captions, the agent sidebar output, streamed `agent-stream` token deltas, `agent-results` final cards, presence, and in-meeting chat. Media (audio/video, screen share) rides the LiveKit React client to the LiveKit SFU, separately.
- Socket.io rooms are keyed by `meeting_id`. The client joins the `meeting_id` room; cross-instance fan-out happens server-side over the `nexus:{org_id}:pubsub:meeting:{meeting_id}` Redis channel and is invisible to the client.
- The two socket channels the sidebar consumes: `agent-stream` (disposable token deltas, `AgentStreamDelta` envelope) and `agent-results` (durable final cards, `AgentResult` schema).
- Rendering: RSC-first. Server components are the default; a component opts into `"use client"` only for interactivity, browser APIs, or a live subscription. Server Actions are the write chokepoint and the only path the browser can write through.
- Auth: Clerk. `<ClerkProvider>` wraps the root layout; middleware guards `(app)` and `(admin)`. The Clerk session JWT carries the `org` claim; `api-gateway` verifies it and injects `org_id` server-side. The browser never derives or sends `org_id`.

## Where things live

- `app/` - routes only: RSC pages, layouts, route handlers, Server Actions. No business logic beyond orchestration.
  - `app/layout.tsx` - root: `ClerkProvider`, fonts, globals, token layer.
  - `app/(marketing)/` - unauthenticated landing, pricing, self-serve signup.
  - `app/(auth)/` - Clerk sign-in / sign-up / SSO callback.
  - `app/(app)/` - authenticated app shell. `app/(app)/layout.tsx` is the single place org/tenant context, per-tenant theming, and locale are resolved (reads the Clerk session, resolves the active `org_id` and `tenant_settings`, renders the nav shell, exposes a typed `OrgContext`).
  - `app/(app)/meetings/[meetingId]/room/page.tsx` - the `"use client"` meeting room + agent sidebar (heavy LiveKit + Socket.io bundle, dynamically imported on this route only).
  - `app/(admin)/` - RBAC-gated tenant and ops consoles; `app/(admin)/layout.tsx` holds the RBAC gate (UX courtesy; real enforcement is server-side).
  - `app/api/` - route handlers only, no business logic: `livekit-token/route.ts` (proxies `POST /api/v1/meetings/:id/token`, holds no LiveKit secret), `health/route.ts`.
- `components/ui/` - the only visual vocabulary: `Button`, `Input`, `Modal`, `Card` (with optional `priorityStrip`), `EmptyState`, `Avatar`, `Badge`. Feature components compose these and never add ad-hoc styling.
- `components/meeting/` - video grid, captions, controls, chat. `components/sidebar/` - agent sidebar sections, cards, toasts.
- `lib/api/` - the generated TS client (from the OpenAPI 3.1 spec) plus the single gateway base URL. No component holds a service URL.
- `lib/realtime/` - `SocketProvider` (joins the `meeting_id` room) and `LiveKitRoom` wrappers; both wrap the meeting-room subtree only.
- `lib/query/` - TanStack Query keys and client. `lib/store/` - Zustand stores (sidebar, toasts, device-check, draft streaming cards). `lib/motion/` - the frozen Framer Motion variants.
- `app/globals.css` + `tailwind.config.ts` - the token layer (CSS custom properties), the single source of visual truth. Components read tokens, never raw hex.
- `e2e/` - Playwright specs, including a11y.

## Invariants you must not break

| Rule | Why | If you break it |
| --- | --- | --- |
| `org_id` is always server-derived and always present; never injected, trusted, or sent from the browser | Tenancy is enforced at every server layer (RLS, namespaced Redis, per-tenant Qdrant, org-partitioned `nexus_knowledge`); the gateway is the only place `org_id` is decided | Cross-tenant leakage class of bugs; you would be re-deriving a boundary the browser must not own |
| No secrets client-side; only `NEXT_PUBLIC_*` reaches the bundle | Clerk secret key, Sentry token, LiveKit/Deepgram/service credentials are server-only | Credential exfiltration from the shipped JS bundle |
| Backend access only through `api-gateway`/`bff` (REST) and `realtime-gateway` (WSS) | Lets the service mesh evolve without a frontend change; keeps the `org_id`-injection chokepoint intact | You bypass auth/tenancy injection and couple the UI to internal services |
| No direct DB access; never filter by tenant client-side | This repo has no database; responses arrive already `org_id`-scoped | Duplicated, drift-prone, leaky tenant logic |
| No silent writes: agent decisions/actions require user Confirm | Only on Confirm does `core-api` emit on `decisions`/`actions` and `knowledge-graph-service` create the `nexus_knowledge` edge | The agent persists facts the user never approved |
| WebSocket carries no durable truth | Finals are durable in Postgres; a dropped socket must lose nothing and re-hydrate from `core-api` | Treating a missed `agent-stream` delta as data loss; phantom data loss on reconnect |
| Live caption render within the < 2 s SLO, no layout shift; interims mutable and never persisted | The product's core real-time promise | Captions feel laggy or jump; you persist an interim the server treats as throwaway |
| Accessibility is a gate, not a courtesy | shadcn primitives are accessible by default; a11y is verified in Playwright | Keyboard/focus/contrast regressions ship and block the PR |

## Naming authority

Service, topic, and entity names are frozen in the `mytheus-docs` `_canon/` (`01-service-catalog.md`, `02-data-model.md`, `03-event-taxonomy.md`) and the Glossary (doc 24). Never invent or rename a service, topic, or store name locally. Use these verbatim where referenced: `agent-stream`, `agent-results`, `transcript-chunks`, `decisions`, `actions`, the Redis prefix `nexus:{org_id}:`, `nexus_knowledge`, `meeting_id`. If a name seems missing or wrong, check `_canon/` first; a rename must land in the canon/Glossary before it appears here.

## Conventions

- TypeScript strict everywhere; no `any` without justification.
- Server components are the default. Add `"use client"` only for interactivity, browser APIs, or a live subscription (meeting room, agent sidebar, captions, RAG context panel, optimistic forms). Keep client islands as small and as leaf-ward as possible.
- Mutations are Server Actions: call the canonical endpoint through `bff`/`api-gateway`, then `revalidateTag()` the affected RSC cache tag (tags keyed by resource, e.g. `meeting:{id}`, `tasks:{userId}`). Server Actions degrade gracefully without client JS.
- Where calls belong: RSC fetches (server-side, to `/bff/*` or a catalog read endpoint) and Server Actions for reads/writes that can be server-side; the generated `lib/api/` client for client reads/mutations. No component holds an origin other than the gateway and the realtime WSS host.
- State management:
  - Server cache: Next.js RSC fetch cache, tag-based revalidation on writes.
  - Async client cache: TanStack Query for client CRUD reads/mutations; query keys mirror resources (`["tasks", userId]`, `["meeting", id]`); optimistic updates always carry a rollback path keyed on the server's response.
  - Ephemeral UI state: Zustand (sidebar collapse, draft streaming cards, toast queue, device-check).
  - Live event state: Socket.io reduces captions/agent cards/presence into the Zustand live store.
  - Auth/session and active `org_id` come from Clerk only, never stored in app state.
  - Reconciliation rule: a streamed `agent-results` card writes into the Zustand live store for immediate render AND is reconciled against the TanStack Query list cache (a confirmed decision invalidates `["decisions", meetingId]`).
- Styling: compose `components/ui/` primitives; read tokens from the CSS-custom-property layer, never raw hex. Dark mode and per-tenant theming flip by swapping a token set.
- Motion: use only the shared variants in `lib/motion/` (`cardEnter`, `bannerPulseOnce`, `toastDwell`). Calm, not flashy: ~150 ms fade+slide, no bounce/flash/shake, at most one attention motion at a time, `prefers-reduced-motion` degrades entrances to instant opacity.
- Naming: `snake_case` JSON on the wire (mirrors backend columns); `PascalCase` components; `camelCase` hooks and vars.
- Error/loading boundaries: use `Suspense` for progressive `bff` aggregate streaming; reserve per-card min-height in the sidebar so streamed text appends without layout thrash.
- Priority color language (frozen): red (`--priority-high`, act now), yellow (`--priority-medium`, attention), blue (`--priority-low`, info). The red conflict banner pre-empts and is pinned to the top above all other cards regardless of arrival order.

## Common tasks (recipes)

Add a new authenticated screen
1. Create the route under `app/(app)/<name>/page.tsx`. Keep it an RSC unless it needs a live subscription or local interaction.
2. Fetch data server-side from a `/bff/*` screen endpoint or a catalog read endpoint via the forwarded JWT. Tag the fetch by resource for revalidation.
3. Compose `components/ui/` primitives; add an `EmptyState` and a `Suspense` fallback. Do not re-resolve tenancy; it is already in `OrgContext` from `(app)/layout.tsx`.
4. Add Playwright a11y coverage (keyboard nav, focus order, contrast) in `e2e/`.

Call a new bff endpoint
1. Confirm the endpoint shape in `19-api-architecture.md` and that the name matches `_canon/`. The TS client in `lib/api/` regenerates from the OpenAPI spec, so prefer regenerating over hand-writing types.
2. For a read on an RSC page, fetch server-side with a resource cache tag. For a client read, use TanStack Query with a resource-mirroring key.
3. Never add a new origin; the call must terminate at `api-gateway`.

Add an optimistic mutation
1. Write a Server Action that calls the canonical `/api/v1/...` endpoint through `bff`/`api-gateway` with an `Idempotency-Key`.
2. Apply the optimistic update in TanStack Query with a rollback path keyed on the server response.
3. On success, `revalidateTag()` (Server Action) or invalidate the affected query key so the list reconciles.

Subscribe to a new realtime event
1. Add the handler in the `lib/realtime/` `SocketProvider` (meeting-room subtree only); the client is already joined to the `meeting_id` room.
2. Reduce the event into the Zustand live store; render from the store.
3. Treat deltas as disposable: the final `agent-results` (or a REST re-hydrate from `core-api`) must reconstruct the full state, so a missed delta is never data loss.
4. Ensure reconnect re-hydrates history from `core-api` so nothing durable is lost.

Surface an agent decision/action card
1. Render the card from the `agent-results` payload (priority strip, frozen color language).
2. Do not write anything. Wire a Confirm action that calls the canonical confirm endpoint (`POST /decisions/:id/confirm`, `POST /actions/:id/confirm`); only then does the backend persist and create the `nexus_knowledge` edge.
3. Reconcile the confirmed result into the relevant TanStack Query list cache.

## Testing

- Vitest + Testing Library: unit/component tests for primitives, hooks, store reducers, and the sidebar streaming logic specifically (delta accumulation, correlation-keyed draft -> final swap, conflict-banner pinning). TDD: write the test before the implementation for these.
- Playwright: end-to-end flows (sign-in, join meeting room, confirm a decision, Save-for-later persistence) and accessibility (keyboard-only navigation of the room and sidebar, focus order, priority-strip contrast in both light and dark token sets). A11y lives in the E2E suite, not a separate audit.
- What to mock: the `api-gateway`/`bff` REST responses and the `realtime-gateway` socket. Never hit a real backend service from a test.
- Quality gates that must pass before a PR: lint, typecheck, Vitest (with coverage), `next build`, Playwright (including a11y).

## Local development

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
pnpm dev          # http://localhost:3000
pnpm build && pnpm start
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (unit + component)
pnpm test:coverage
pnpm test:e2e     # Playwright (E2E + a11y)
pnpm test:e2e:ui  # Playwright UI runner
```

Prerequisites: Node 20+, pnpm (`corepack enable && corepack prepare pnpm@latest --activate`).

Required env vars (public ones reach the browser; never put a secret in a `NEXT_PUBLIC_*` var):
- `NEXT_PUBLIC_API_GATEWAY_URL` - the only REST origin the client holds.
- `NEXT_PUBLIC_REALTIME_WS_URL` - `realtime-gateway` WSS origin.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`.
- `CLERK_SECRET_KEY` - server only (RSC / route handlers).
- `NEXT_PUBLIC_LIVEKIT_URL` - SFU connect host only; tokens are minted server-side.
- `NEXT_PUBLIC_SENTRY_DSN`; `SENTRY_AUTH_TOKEN` - server/CI only (sourcemap upload).
- `NEXT_PUBLIC_OTEL_EXPORTER_URL` (optional), `NEXT_PUBLIC_APP_ENV`.

## Pitfalls

- RSC/client boundary: dropping `"use client"` high in the tree drags the heavy LiveKit + Socket.io bundle onto the dashboard and blows the JS budget. Keep client islands leaf-ward; the meeting room bundle must load only on its route.
- Secret leakage: anything you read at module scope in a client component ships in the bundle. Server-only secrets must stay in RSC, route handlers, or backend services.
- Missing `org_id`: do not pass, read, or "fix up" `org_id` in the browser. If a server response looks cross-tenant, the bug is server-side; the client surfaces `404` as not-found (existence is tenant-confidential, `403` is not used).
- Hydration: do not branch on `window`, locale, or theme during render in a way that differs between server and client. Locale/theme/`org_id` resolve at `(app)/layout.tsx`, not per-component.
- WS reconnect: assume drops. Socket.io reconnects with backoff and re-joins the `meeting_id` room; you must re-hydrate caption/agent/transcript history from `core-api` and re-mint the LiveKit token via `app/api/livekit-token/route.ts`. Never assume continuous delivery.
- Backpressure: under a slow connection `realtime-gateway` drops `agent-stream` deltas first; the final `agent-results` card still arrives (possibly without progressive animation). Captions and confirmed outputs are never dropped.

## Working with other repos

This repo consumes contracts; it must stay compatible with them and must not redefine them.
- mytheus-backend (`api-gateway`/`bff`): the REST shapes this UI calls (`/bff/*` screen endpoints, `/api/v1/...` resource endpoints). The TS client regenerates from the published OpenAPI 3.1 spec, so wire drift is structurally prevented; regenerate rather than hand-edit types. The `oasdiff` breaking-change gate lives in the backend repos.
- mytheus-realtime (`realtime-gateway` + `transcription-service`): the Socket.io events and envelopes this UI subscribes to (`agent-stream` `AgentStreamDelta`, `agent-results` `AgentResult`, captions, presence, chat) and the `meeting_id` room contract.
- mytheus-events: the Redpanda topic and Avro schema names (`transcript-chunks`, `agent-stream`, `agent-results`, `decisions`, `actions`) - referenced by name only, never produced/consumed here.
- mytheus-docs: the `_canon/` naming authority and the architecture specs.
- mytheus-mobile: the other client of the same backend. Keep REST/WS usage compatible; do not push backend changes that would only suit web.

## Commit and PR conventions

- Trunk-based workflow with short-lived branches and mandatory PR review.
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- CI must pass on every PR: lint, format check (Prettier), typecheck, Vitest, `next build`, Playwright (including a11y), per-PR preview deploy.
- Commits and PRs in this project must NOT include a `Co-Authored-By` footer.
