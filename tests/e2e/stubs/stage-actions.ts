// The room's top-chrome server actions (components/room/stage-actions.ts), answered as core-api
// would on success, with a meeting that has one card nobody confirmed and one open agenda item.
const ITEM = "11111111-1111-4111-8111-111111111111";
const at = "2026-11-11T10:00:00Z";
const item = (id: string, position: number, title: string, status: string) => ({
  id,
  position,
  title,
  owner_user_id: null,
  duration_minutes: 10,
  status,
  status_source: "host",
  agent_note: null,
  updated_at: at,
  goal_id: null,
  started_at: status === "in_progress" ? new Date().toISOString() : at,
  ended_at: status === "covered" ? new Date().toISOString() : null,
  extended_minutes: 0,
});
const wrapUp = () => {
  const started = new Date().toISOString();
  return {
    meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    status: "live",
    seconds: 60,
    wrap_up_started_at: started,
    wrap_up_by: "u-maya",
    deadline: new Date(Date.parse(started) + 60_000).toISOString(),
    closed_at: null,
    closed_by: null,
    pending: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        kind: "action",
        content: "Write the release notes",
        rationale: null,
        assignee_id: null,
        due_date: null,
        created_at: at,
      },
    ],
    open_items: [item(ITEM, 0, "Beta readiness", "in_progress")],
    unowned_action_ids: ["55555555-5555-4555-8555-555555555555"],
  };
};
export async function advanceAgenda() {
  return { ok: true as const, items: [item(ITEM, 0, "Beta readiness", "covered")], current: null };
}
export async function extendAgendaItem() {
  return { ok: true as const, item: { ...item(ITEM, 0, "Beta readiness", "in_progress"), extended_minutes: 5 } };
}
export async function loadWrapUp() {
  return { ok: true as const, wrapUp: wrapUp() };
}
export async function startWrapUp() {
  return { ok: true as const, wrapUp: wrapUp() };
}
export async function cancelWrapUp() {
  return { ok: true as const, wrapUp: { ...wrapUp(), wrap_up_started_at: null, deadline: null } };
}
export async function closeMeeting() {
  return {
    ok: true as const,
    closed: {
      meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      status: "ended",
      closed_at: new Date().toISOString(),
      closed_by: "u-maya",
      review_owner_id: "u-maya",
      moved_decisions: 0,
      moved_actions: 1,
    },
  };
}
export async function assignActionCard(_id: string, assigneeId: string) {
  return { ok: true as const, assigneeId };
}
export async function loadCatchUp() {
  return {
    ok: true as const,
    summary: {
      meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      status: "live",
      decision_count: 2,
      action_count: 1,
      decisions: [
        { id: "d-1", content: "Open the beta to five customers", confirmed_by: "u-raj", created_at: at },
        { id: "d-2", content: "Keep pricing flat for Q1", confirmed_by: "u-maya", created_at: at },
      ],
      actions: [{ id: "a-1", content: "Draft the launch email", assignee_id: "u-raj", due_date: null, created_at: at }],
      agenda_done: 0,
      agenda_total: 2,
      current_item: item(ITEM, 0, "Beta readiness", "in_progress"),
    },
  };
}
export async function askStandIn(_m: string, _u: string, question: string) {
  return {
    ok: true as const,
    answer: {
      question,
      outcome: "answered",
      query_class: "decision_lineage",
      target_scope: "same_team",
      sources: [
        {
          kind: "decision",
          id: "d-9",
          text: "Pricing stays flat for Q1",
          meeting_id: null,
          meeting_title: "Pricing sync",
          status: "confirmed",
          due_date: null,
          occurred_at: at,
        },
      ],
      fill_id: "f-1",
    },
  };
}
