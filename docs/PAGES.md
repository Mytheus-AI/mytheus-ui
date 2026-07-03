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
| `/sign-in`, `/sign-up` | RSC redirect to `/dashboard` | none | bypass; restore Clerk here (see the `TODO(auth)` markers) |

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

The org/tenant context is resolved once in `../src/app/(app)/layout.tsx`
(mock `OrgContext` today, Clerk session later). Screens never re-resolve
tenancy.

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
