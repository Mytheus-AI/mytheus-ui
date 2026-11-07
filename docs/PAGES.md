# Pages

The full route map of `mytheus-ui`: every route, its render mode, where its
data comes from today (all mock), and which server contract it swaps to
later (per doc 20 of the architecture set). Everything below builds
statically today - the three dynamic meeting routes prerender via
`generateStaticParams` over the mock meeting ids.

Render modes: RSC = server component, Client = `"use client"` page,
RSC+island = server page with a client island.

## (marketing) - public site

| Route | Render | Data | Status |
| --- | --- | --- | --- |
| `/` | RSC + client sections | copy in components | done |
| `/pricing` | RSC | plan matrix inline (values from doc 18) | done |
| `/features` | RSC | `../src/lib/marketing/features.ts` | done |
| `/features/personal-agent` ... `/features/integrations` (11 pages) | RSC | same registry via `FeaturePage` template | done |
| `/enterprise`, `/security`, `/students`, `/students/verify`, `/blog`, `/careers`, `/privacy`, `/terms` | RSC (verify is client) | copy inline | done |

The landing page's section order lives in `../src/app/(marketing)/page.tsx`.
Feature pages are thin wrappers: copy lives in the registry, the shared
template is `../src/components/marketing/FeaturePage.tsx`, visuals in
`../src/components/marketing/feature-visuals.tsx`.

## (auth)

| Route | Render | Data | Status |
| --- | --- | --- | --- |
| `/sign-in/[[...rest]]` | Client (custom Clerk flow) | Clerk `useSignIn` | done: password, email code (`/factor-one`), 2FA (`/factor-two`), reset (`/forgot-password`) |
| `/sign-up/[[...rest]]` | Client (custom Clerk flow) | Clerk `useSignUp` | done: details, `/verify-email-address`, `/continue` |
| `/sso-callback` | Client | Clerk OAuth callback + bot check (`#clerk-captcha`) | done |
| `/onboarding/organization` | Client | Clerk `choose-organization` session task | done |

## (app) - authenticated shell

All screens read `../src/lib/mock/data.ts` today. The "later" column is the
screen-shaped `bff` endpoint (or resource endpoint) each swaps to.

| Route | Render | Later | Status |
| --- | --- | --- | --- |
| `/dashboard` | RSC | `GET /bff/dashboard` | done |
| `/meetings` | RSC | `GET /bff/meetings` | done |
| `/meetings/[id]` | RSC | `GET /bff/meeting/:id` | done |
| `/meetings/[id]/room` | RSC + client `MeetingRoom` | `GET /bff/meeting-room/:id` + Socket.io (`agent-stream`, `agent-results`, captions, chat) + LiveKit | UI done; live plumbing TODO |
| `/meetings/[id]/transcript` | RSC + client `TranscriptView` | `transcript_chunks` read endpoint | done |
| `/decisions` | RSC | `decisions` read endpoint (`FOLLOWS_FROM` from knowledge graph) | done |
| `/tasks` | Client | `action_items` read + confirm/complete Server Actions | UI done; writes are visual-only |
| `/org` | RSC | departments/teams read endpoint | done |
| `/search` | Client | `search-service` / `rag-service` | done (mock index) |
| `/settings` | Client | `tenant_settings` | done |
| `/settings/profile` | Client | user profile + `get_user_context` fields | done |
| `/settings/integrations` | Client | `integration_connections` | done (toggles visual-only) |
| `/billing` | RSC | `billing-metering-service` via bff | done |
| `/people/[id]` | RSC | `GET /bff/people/{user_id}` (real for a uuid; mock for org-chart name slugs) | done |
| `/meetings/[id]/decisions/[decisionId]` | RSC | decision lineage template via `bff` -> `knowledge-graph-service` | done (mock) |
| `/meetings/[id]/collaborations` | RSC | `GET /api/v1/meetings/:id/collaborations` (`agent_collaborations`) | done (mock) |
| `/tenant` | RSC, admin-gated | `admin-ops-service` `/admin/tenant/*` | done (mock); request buttons disabled until the service exists |
| `/tenant/usage` | RSC, admin-gated | `billing-metering-service` `/usage` | done (mock) |

`/tenant` deviates from doc 20, which files it under `(admin)`: it is a workspace admin's
console, so it lives in the app shell; `(admin)` stays the platform-staff surface. The gate is
the Clerk organization role (`org:admin`), UX only: the API enforces the RBAC tier.

The org/tenant context is resolved once in `../src/app/(app)/layout.tsx`
(mock `OrgContext` today, Clerk session later). Screens never re-resolve
tenancy. The route group also has a shared `loading.tsx` skeleton
(`../src/app/(app)/loading.tsx`) so navigations inside the shell never
flash blank.

## (admin) - consoles

| Route | Render | Later | Status |
| --- | --- | --- | --- |
| `/admin` | RSC | tenant admin endpoints | done (mock tenants) |
| `/ops` | RSC | internal ops plane | done; gated by the `OPS_CONSOLE_ENABLED` constant in the page |

## Not routes

`/api/health` exists as a route handler. `not-found.tsx` renders the branded
404 for anything else.

## Adding a screen

Follow the "Add a new authenticated screen" recipe in `../CLAUDE.md`, then
add the route to the sidebar (`../src/components/app/Sidebar.tsx`), the
topbar titles (`../src/components/app/Topbar.tsx`), and this table.
