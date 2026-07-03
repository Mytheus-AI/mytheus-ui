# Mock data

Everything under `(app)/` and `(admin)/` renders from one module:
`../src/lib/mock/data.ts`. It stands in for the `bff` / `api-gateway`
responses until the backend ships. The landing page's "Between meetings"
scene reads from it too, so the marketing demo and the app tell the same
story (the $49 pricing decision that resurfaces in Q3 planning).

## Entities

| Export | Type | Consumed by |
| --- | --- | --- |
| `mockOrgContext` | `OrgContextValue` (org, user, plan, role) | `(app)`/`(admin)` layouts via `OrgProvider` |
| `mockMeetings` | `Meeting[]` (status: live/upcoming/past, counts) | dashboard, meetings list, meeting detail/room/transcript params |
| `mockMeetingDetails` | `MeetingDetail[]` (agenda, recap) | meeting detail |
| `mockTranscriptChunks` | `TranscriptChunk[]` (speaker, mm:ss offset, text) | transcript view |
| `mockDecisions` | `Decision[]` (priority, `lineage` = FOLLOWS_FROM chain) | dashboard, decisions, meeting detail |
| `mockActions` | `ActionItem[]` (assignee, due, status) | dashboard, tasks, meeting detail |
| `mockRoomParticipants` | `RoomParticipant[]` (mic/cam/speaking) | meeting room grid |
| `mockCaptions` | `CaptionLine[]` | meeting room caption strip |
| `mockRoomChat` | `ChatMessage[]` | meeting room chat tab |
| `mockAgentSidebar` | `AgentSidebarCard[]` (a discriminated union, one card per sidebar section) | agent sidebar |
| `mockDepartments` | `Department[]` (teams, members, leads) | org chart |
| `mockIntegrations` | `IntegrationConnection[]` | settings/integrations |
| `mockBilling` | invoice history, seats, plan | billing |
| `mockTenants` | `Tenant[]` | admin console |
| `mockTenantOps` | `TenantOps[]` (cost, token spend, flags, tickets) | ops console |
| `mockSearchIndex` | `SearchResult[]` | search |
| `mockTeamCapacity`, `mockSourcedAnswer` | landing scene + dashboard digest | Statement section, dashboard |

Conventions inside the module: ids look like real ids (`mtg_1`, `dec_2`,
`org_demo`), dates are ISO strings, priorities use the frozen
`high/medium/low` union, and the shapes deliberately mirror the backend
column names described in the architecture docs so the swap is mechanical.

## The swap-to-real path

When the backend exists, screens move off this module in three steps (the
conventions are in `../CLAUDE.md`):

1. Reads: replace the import with a server-side fetch to the screen's
   `/bff/*` endpoint (RSC pages) or a TanStack Query call through the
   generated `lib/api/` client (client pages). Tag RSC fetches by resource
   (`meeting:{id}`, `tasks:{userId}`) for revalidation. The route-to-endpoint
   mapping is in [PAGES.md](PAGES.md).
2. Writes: the visual-only interactions (task complete, integration connect,
   decision confirm) become Server Actions calling the canonical
   `/api/v1/...` endpoint with an `Idempotency-Key`, then
   `revalidateTag()`. The UI already renders the optimistic end state, so
   the wiring adds a rollback path, not new UI.
3. Live: the meeting room swaps `mockCaptions`/`mockAgentSidebar` for the
   Socket.io reducers (`agent-stream` deltas, `agent-results` finals) in a
   `lib/realtime/` provider, and the video grid mounts LiveKit. The sidebar
   component was written against the same card shapes the `agent-results`
   schema carries, so cards render from the store instead of the array.

Delete entities from the mock module as their consumers migrate; nothing
else imports it.

## Adding mock data

Extend the module, do not fork it: one new exported type + one exported
const, shaped like the backend contract you expect, consumed via import.
Keep the story coherent - new entries should be consistent with the existing
meetings, people, and the pricing-decision narrative.
