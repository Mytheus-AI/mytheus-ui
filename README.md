# Mytheus - Web UI (`mytheus-ui`)

The Next.js 14 web frontend for **Mytheus** - the meeting room, the per-participant agent sidebar, dashboards, and all client-facing screens.

## What this is

`mytheus-ui` houses the **web-app**: the browser-facing client of Mytheus. Mytheus is an intelligent meeting-orchestration, multi-tenant SaaS in which every participant gets a **personal AI agent** that attends their meetings, captures role-relevant notes, suggests questions in real time, and surfaces detected decisions, action items, and conflicts.

This repo renders that experience: a React Server Components-first Next.js 14 App Router app that streams the dashboard, runs the live meeting room (LiveKit video + live captions + the agent sidebar), and presents settings, billing, and admin consoles. It is an **edge/client-tier** application - it owns **no backend data**. Every durable fact (a confirmed decision, a persisted worklog, a final caption) arrives over a server contract; the client owns rendering, optimistic UI, animation discipline, and reconnect resilience.

> The split is deliberate: **the server decides what is true; the client decides how it appears.**

## Where it sits

```
Browser ──HTTPS/WSS──▶ Cloudflare CDN + WAF
                          │  HTTPS (REST)            │  WSS (Socket.io)
                          ▼                          ▼
                      api-gateway ───▶ bff      realtime-gateway
                   (JWT pre-validate,   (screen   (captions, agent
                    org_id, rate limit)  aggregation)  output, presence)
```

- The client knows **exactly two origins**: the `api-gateway` HTTPS origin (REST, via `bff`) and the `realtime-gateway` WSS origin (live plane). It never holds a service URL.
- CRUD reads/writes go `web-app → api-gateway → bff → services` over REST.
- The live plane (captions, agent token streaming, presence, in-meeting chat) rides Socket.io to `realtime-gateway`; media (audio/video, screen share) rides the LiveKit React client to the LiveKit SFU.
- Auth is **Clerk**; `org_id` is extracted from the Clerk JWT at `api-gateway` and injected server-side. The browser is **not** a tenancy boundary.

See the architecture canon for the authoritative view: `03-container-architecture.md` (where web-app sits), `20-frontend-architecture.md` (the primary frontend spec), `19-api-architecture.md` (the API surface this UI calls), and `11-security-architecture.md` / `06-multi-tenancy.md` (Clerk auth, `org_id`, JWT). These live in the **mytheus-docs** repo. Conceptually, `mytheus-ui` consumes **mytheus-backend** (CRUD/control plane via `api-gateway`→`bff`) and **mytheus-realtime** (the WSS live plane).

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 14** (App Router, RSC streaming, Server Actions) |
| UI runtime | **React 18** (React Server Components-first) |
| Language | **TypeScript** (strict) |
| Auth | **Clerk** Next.js SDK (`@clerk/nextjs`) |
| Real-time (non-AV) | **Socket.io client** → `realtime-gateway` |
| Media | **LiveKit React client** (`@livekit/components-react`) → LiveKit SFU |
| Styling | **TailwindCSS** + **shadcn/ui** (copy-in primitives) over a CSS-custom-property token layer |
| Server data | **RSC fetch cache** (Next.js, tag-based revalidation) |
| Async client data | **TanStack Query** (reads/mutations, optimistic updates) |
| Ephemeral client state | **Zustand** (sidebar collapse, draft streaming cards, toast queue) |
| Motion | **Framer Motion** (frozen, shared variants only) |
| Testing | **Vitest** + **Testing Library** (unit/component), **Playwright** (E2E + a11y) |
| Observability | **Sentry** browser SDK + Web Vitals + OpenTelemetry browser |

## Repo structure

```
mytheus-ui/
  app/
    layout.tsx                   # ClerkProvider, fonts, globals, token layer
    (marketing)/                 # unauthenticated: landing, pricing, self-serve signup
      page.tsx
      pricing/page.tsx
    (auth)/                      # Clerk sign-in / sign-up / SSO callback
      sign-in/[[...rest]]/page.tsx
      sign-up/[[...rest]]/page.tsx
    (app)/                       # authenticated app shell; org context resolved in layout
      layout.tsx                 # <OrgProvider> + <AppShell> (nav, top bar, theme/locale)
      dashboard/page.tsx
      meetings/
        page.tsx                 # meeting list (RSC)
        [meetingId]/
          page.tsx               # meeting detail (pre/post)
          room/page.tsx          # "use client" meeting room + agent sidebar
          transcript/page.tsx    # RSC transcript view (FTS search)
      decisions/page.tsx         # decision history + FOLLOWS_FROM lineage
      tasks/page.tsx             # My Tasks (action_items assigned to me)
      org/page.tsx               # org chart (departments/teams)
      search/page.tsx            # RAG + FTS search with citations
      settings/
        profile/page.tsx
        integrations/page.tsx    # Calendar / Slack / Jira|Linear
        billing/page.tsx         # plan, seats, usage, invoices
    (admin)/                     # RBAC-gated consoles
      layout.tsx                 # RBAC gate
      tenant/page.tsx            # tenant admin console
      ops/page.tsx               # internal ops console (feature-flagged)
    api/                         # route handlers only - no business logic
      livekit-token/route.ts     # proxies POST /api/v1/meetings/:id/token
      health/route.ts
  components/                    # design system primitives + feature components
    ui/                          # Button, Input, Modal, Card, EmptyState, Avatar, Badge
    meeting/                     # video grid, captions, controls, chat
    sidebar/                     # agent sidebar sections, cards, toasts
  lib/                           # api clients, hooks, socket/livekit providers, query keys
    api/                         # generated TS client (from OpenAPI), gateway base URL
    realtime/                    # SocketProvider, LiveKitRoom wrappers
    query/                       # TanStack Query keys + client
    store/                       # Zustand stores (sidebar, toasts, device-check)
    motion/                      # frozen Framer Motion variants
  e2e/                           # Playwright specs (incl. a11y)
  public/
  app/globals.css                # token layer (CSS custom properties)
  tailwind.config.ts
  next.config.mjs
  vitest.config.ts
  playwright.config.ts
  tsconfig.json
  package.json
```

## Quick start

**Prerequisites**

- **Node 20+**
- **pnpm** (`corepack enable && corepack prepare pnpm@latest --activate`)

```bash
# 1. install
pnpm install

# 2. configure environment
cp .env.example .env.local
#   then fill in the values from the table below

# 3. run the dev server (http://localhost:3000)
pnpm dev

# 4. production build + start
pnpm build
pnpm start

# 5. quality gates
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest (unit + component)
pnpm test:e2e    # Playwright
```

## Environment variables

The client knows only two backend origins; everything tenant-scoped is derived from the Clerk JWT server-side, never from the browser. **No secret is ever exposed to the client** - only `NEXT_PUBLIC_*` values reach the browser bundle.

| Variable | Public? | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_GATEWAY_URL` | yes | HTTPS origin of `api-gateway` (e.g. `https://api.mytheus.app`). The only REST origin the client holds. |
| `NEXT_PUBLIC_REALTIME_WS_URL` | yes | WSS origin of `realtime-gateway` (captions, agent stream, presence, chat). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key (front-channel). |
| `CLERK_SECRET_KEY` | no (server) | Clerk secret key for server-side session verification in RSC / route handlers. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | Clerk sign-in route (`/sign-in`). |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | Clerk sign-up route (`/sign-up`). |
| `NEXT_PUBLIC_LIVEKIT_URL` | yes | LiveKit SFU WSS URL (media). Room tokens are minted server-side; this is only the connect host. |
| `NEXT_PUBLIC_SENTRY_DSN` | yes | Sentry browser DSN. |
| `SENTRY_AUTH_TOKEN` | no (server) | Sentry release/sourcemap upload token (CI only). |
| `NEXT_PUBLIC_OTEL_EXPORTER_URL` | yes | OpenTelemetry browser collector endpoint (optional). |
| `NEXT_PUBLIC_APP_ENV` | yes | `development` \| `preview` \| `production`, for environment-aware behavior. |

> LiveKit credentials, Deepgram keys, and all service secrets live **server-side in the backend services** (`meeting-service`, `transcription-service`) - never in this repo. The `app/api/livekit-token/route.ts` handler proxies the mint; it holds no LiveKit secret.

## Testing

- **Vitest + Testing Library** - unit and component tests for primitives, hooks, stores, and the agent-sidebar reducers (delta accumulation, draft→final swap, conflict-banner pinning).
- **Playwright** - end-to-end flows (sign-in, join meeting room, confirm a decision, save-for-later persistence) **and accessibility checks**: keyboard-only navigation of the meeting room and sidebar, focus order, and contrast of the red/yellow/blue priority strip against both light and dark token sets. A11y is part of the E2E suite, not a separate audit.

```bash
pnpm test           # Vitest watch/CI
pnpm test:coverage  # coverage report
pnpm test:e2e       # Playwright (headless)
pnpm test:e2e:ui    # Playwright with UI runner
```

## Related repos

All eight `mytheus-*` repos make up Mytheus:

| Repo | One-liner |
| --- | --- |
| **mytheus-ui** | This repo - the Next.js 14 web-app: meeting room, agent sidebar, dashboards, settings. |
| **mytheus-docs** | The frozen architecture canon and naming authority (the `_canon/` source of truth) - service, topic, and entity names. |
| **mytheus-backend** | The CRUD/control-plane services behind `api-gateway`→`bff` (core-api, identity-tenant, meeting, billing-metering, integration, admin-ops, notification). |
| **mytheus-realtime** | The `realtime-gateway` + `transcription-service` live plane - Socket.io fan-out, Deepgram proxy, live captions. |
| **mytheus-intelligence** | The AI/inference tier - the six LangGraph agents (`agent-runtime-service`), RAG, embedding/reranker, knowledge-graph (`nexus_knowledge`). |
| **mytheus-events** | The event backbone - Redpanda topics (`transcript-chunks`, `agent-stream`, `agent-results`, …), Avro schemas, Schema Registry. |
| **mytheus-platform** | Infrastructure-as-code, Kubernetes/Terraform, CI/CD, and observability platform. |
| **mytheus-mobile** | The mobile client of Mytheus. |

## License

Proprietary. © Mytheus. All rights reserved.
