import type { Metadata } from "next";
import { PromiseLedger, type LedgerFocus, type SlackState } from "@/components/promises/ledger/PromiseLedger";
import { apiSafe } from "@/lib/api/client";
import { loadIntegrations } from "@/lib/api/integrations";
import { listMembers } from "@/lib/api/members";
import { fetchCapacity, fetchLedger, fetchProposals } from "@/lib/api/promises";

export const metadata: Metadata = { title: "Promise ledger | Mytheus" };

/* My work, Promise ledger (Beyond the meeting, Layer 2): the caller's own promises from every
   channel (`GET /api/v1/promises`), their week (`GET /api/v1/promises/capacity`, read again in the
   viewer's zone once the page is in the browser), the dates people who owe them something asked to
   move, the members (for hand-off and recipients) and whether Slack is connected. Only the ledger
   itself is required: a failed ledger read is thrown to `error.tsx`, never shown as an empty list;
   the side reads degrade to their own quiet states.

   Arriving from a notification: `?offer=commitment:<id>|action:<id>&date=` opens "Renegotiate the
   date" with the agent's suggestion, `?proposal=<id>` and `?focus=<id>` bring that item into view,
   `?review=1` the promises waiting for a yes. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Params = Record<string, string | string[] | undefined>;
const one = (p: Params | undefined, k: string) => (typeof p?.[k] === "string" ? (p[k] as string) : null);

async function slackState(): Promise<SlackState> {
  const load = await loadIntegrations();
  if (load.kind !== "live") return "unknown";
  const item = load.items.get("slack");
  return item && (item.status === "active" || item.status === "degraded") ? "connected" : "not_connected";
}

async function offerFrom(params: Params | undefined): Promise<LedgerFocus["offer"]> {
  const raw = one(params, "offer");
  const date = one(params, "date");
  const [kind, id] = raw?.split(":") ?? [];
  if ((kind !== "commitment" && kind !== "action") || !id || !UUID.test(id)) return null;
  const suggested = date && DATE.test(date) ? date : null;
  if (kind === "commitment") return { kind, id, content: "", due: null, askName: null, suggested };
  const mine = await apiSafe<{ items?: { id: string; content: string; due_date: string | null }[] }>("/api/v1/actions/mine", {
    query: { status: "confirmed" },
  });
  const task = mine.ok ? mine.data.items?.find((t) => t.id === id) : null;
  return task ? { kind, id, content: task.content, due: task.due_date, askName: null, suggested } : null;
}

export default async function PromisesPage({ searchParams }: { searchParams?: Params }) {
  const [ledger, capacity, incoming, members, slack, offer] = await Promise.all([
    fetchLedger(),
    fetchCapacity("UTC").catch(() => null),
    fetchProposals("incoming").catch(() => []),
    listMembers(),
    slackState(),
    offerFrom(searchParams),
  ]);
  const options = members?.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })) ?? null;
  const focusId = one(searchParams, "focus");
  const proposal = one(searchParams, "proposal");
  return (
    <PromiseLedger
      initial={ledger}
      initialCapacity={capacity}
      incoming={incoming}
      members={options}
      slack={slack}
      serverToday={new Date().toISOString().slice(0, 10)}
      focus={{
        offer,
        promise: focusId && UUID.test(focusId) ? focusId : null,
        proposal: proposal && UUID.test(proposal) ? proposal : null,
        review: one(searchParams, "review") === "1",
      }}
    />
  );
}
