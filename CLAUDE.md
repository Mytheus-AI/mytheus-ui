# CLAUDE.md
> AI-agent working guide for `reprise-ui`, the Next.js 14 web frontend (edge/client tier) of Reprise AI.

## 🎯 Purpose

`reprise-ui` is the Reprise AI web app: a Next.js 14 App Router, React Server Components-first client that renders the meeting room, the per-participant agent sidebar (live captions plus streaming agent output), dashboards, search, settings, billing, and admin consoles. Reprise AI is a multi-tenant meeting-orchestration SaaS where every participant gets a personal AI agent. This repo is the edge/client tier: it owns no backend data. It consumes `api-gateway` -> `bff` over REST and `realtime-gateway` over WSS. The rule that governs everything: the server decides what is true; the client decides how it appears.

## 🧱 Stack & Layout

**Stack (with versions)**

| Area | Tech |
| --- | --- |
| Framework | Next.js 14 (App Router, RSC streaming, Server Actions), React 18, TypeScript 5 (strict) |
| Auth & realtime | Clerk (`@clerk/nextjs` 5.x), Socket.io client 4.x -> `realtime-gateway`, LiveKit React for media |
| Styling | TailwindCSS 3 + shadcn/ui over a CSS-custom-property token layer |
| State | TanStack Query 5 (async client cache), Zustand 4 (ephemeral UI state), Framer Motion 11 (frozen variants only) |
| Quality & telemetry | Vitest + Testing Library + Playwright, ESLint/Prettier, Sentry + Web Vitals + OpenTelemetry browser |
| Runtime | Node 20+, pnpm |

**Key folders**

| Path | Role |
| --- | --- |
| `(marketing)`, `(auth)`, `(app)`, `(admin)` | Route groups |
| `(app)/layout.tsx` | The only place org/tenant context, theming, and locale are resolved |
| `lib/api/` | Generated TS client; the single channel for client reads/mutations |
| `components/ui/` | Design-system primitives (`Button`, `Input`, `Modal`, `Card`, `EmptyState`, `Avatar`, `Badge`) |
| `lib/motion/` | Shared, frozen motion variants (`cardEnter`, `bannerPulseOnce`, `toastDwell`) |

## 📐 Conventions

- **Server components are the default.** Add `"use client"` only when you need interactivity, browser APIs, or a live subscription (meeting room, agent sidebar, captions, RAG panel, optimistic forms).
- **Mutations are Server Actions** (or typed client calls) terminating at `api-gateway`. After a write, `revalidateTag()` the affected RSC cache tag.
- **Where API calls live:** server-side in RSC fetches (to `/bff/*` or a catalog read endpoint) and in Server Actions; client reads/mutations go through `lib/api/` (the generated TS client) to the single `api-gateway` origin. No component holds a service URL other than the gateway and the realtime WSS origin.
- **Route groups:** `(marketing)`, `(auth)`, `(app)`, `(admin)`. Org/tenant context (and theming/locale) is resolved only in `(app)/layout.tsx`.
- **Naming:** `snake_case` JSON on the wire (mirrors backend columns); `PascalCase` components; `camelCase` hooks/vars; query keys mirror resources (`["tasks", userId]`, `["meeting", id]`).
- **Design system:** compose `components/ui/` primitives. Never introduce ad-hoc styling; read tokens, never raw hex.
- **Motion:** use only the shared variants in `lib/motion/`. Keep it calm, not flashy, and respect `prefers-reduced-motion`.

## 🚦 Cross-Cutting Rules (non-negotiable)

These apply everywhere.

| Rule | What it means |
| --- | --- |
| ✅ Auth via Clerk only | No custom auth. `<ClerkProvider>` at the root; middleware guards `(app)` and `(admin)`. |
| ⚠️ `org_id` is always server-derived | `org_id` is always present and the browser never injects, trusts, or sends it; `api-gateway` extracts it from the Clerk JWT. The UI displays the active org but cannot widen its scope. Org switching re-authenticates through Clerk; it never mutates a header. |
| ✅ Backend only through approved edges | Talk to the backend only through `api-gateway`/`bff` (REST) and `realtime-gateway` (WSS). Never call a service directly. Never open a second backend origin. |
| ⚠️ Never embed secrets | Only `NEXT_PUBLIC_*` values reach the browser. Clerk secret key, Sentry token, LiveKit/Deepgram/service credentials are server-side only. The LiveKit token route proxies the mint and holds no secret. |
| ✅ No direct DB access | This repo has no database. It renders server-scoped responses and never filters by tenant itself (RLS/Redis/Qdrant/AGE isolation is server-side). |
| ⚠️ No silent writes | Agent decisions/actions surface as cards; the user clicks **Confirm**; only then does the backend persist and create the `nexus_knowledge` edge. |
| ✅ WebSocket carries no durable truth | Anything pushed over a socket is recoverable from REST; a dropped socket loses nothing. Re-hydrate from `core-api` on reconnect. |

## 📛 Naming Authority

Service, topic, and entity names are frozen in `reprise-docs` `_canon/`: never invent or rename. Use these verbatim where referenced: `agent-stream`, `agent-results`, `transcript-chunks`, `decisions`, `actions`, the Redis prefix `nexus:{org_id}:`, and `nexus_knowledge`. If a name seems missing or wrong, check `_canon/` first; a rename must land in the Glossary/canon before use here.

## ✅ Do / ❌ Don't

**✅ Do**

- Keep components server-rendered unless they need the client.
- Put new screens under the correct route group; resolve tenancy in `(app)/layout.tsx`.
- Reconcile streamed `agent-results` into both the Zustand live store and the TanStack Query cache.
- Pin the red conflict banner to the top; honor the frozen red/yellow/blue priority language.
- Carry a rollback path on every optimistic update.
- Add Playwright a11y coverage for new interactive screens.

**❌ Don't**

- Don't call a backend service directly or hardcode a service URL.
- Don't read or trust `org_id` from the browser, the URL, or app state.
- Don't put a secret in client code or a `NEXT_PUBLIC_*` var.
- Don't invent service/topic/entity names; use `_canon/`.
- Don't add bespoke animations or raw colors; use the frozen variants and tokens.
- Don't treat a missing `agent-stream` delta as data loss.
- Don't add a `Co-Authored-By` footer to commits in this project.

## 🛠️ Commands

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm build && pnpm start
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (unit + component)
pnpm test:e2e     # Playwright (E2E + a11y)
```

## 🔀 Pull Requests

- **Trunk-based** workflow with short-lived branches and mandatory PR review.
- **Conventional commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`).
- CI must pass: lint, typecheck, test, build, Playwright, preview deploy.
- **TDD:** write the Vitest test before the implementation for primitives, hooks, store reducers, and sidebar streaming logic.
- **Commits and PRs must NOT include a `Co-Authored-By` footer.**
