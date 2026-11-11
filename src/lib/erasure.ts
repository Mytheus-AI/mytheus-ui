/**
 * Erasing one person's or one meeting's data (Workspace > Data and privacy), as pure functions.
 *
 * The server is admin-ops-service `POST /admin/tenant/erasures` {kind, target_id, confirm}. It
 * checks the typed confirmation itself (the person's email, or the meeting's title, or
 * "Untitled meeting"); the page checks the same thing first so the Erase button only turns on
 * when the words match. Pure so the rule and the summary are testable without a server.
 */

export type ErasureKind = "person" | "meeting";
export const UNTITLED_MEETING = "Untitled meeting";

/** What the admin must type: the email, or the meeting title (trimmed), or "Untitled meeting". */
export function confirmPhrase(kind: ErasureKind, target: { email?: string | null; title?: string | null }): string {
  if (kind === "person") return (target.email ?? "").trim();
  return (target.title ?? "").trim() || UNTITLED_MEETING;
}

/** The server's comparison: case and outer spaces ignored. */
export function confirmMatches(typed: string, phrase: string): boolean {
  return !!phrase && typed.trim().toLocaleLowerCase("en-US") === phrase.trim().toLocaleLowerCase("en-US");
}

const ERASED_LABEL: Record<string, [string, string]> = {
  notes: ["note", "notes"],
  promises: ["promise", "promises"],
  agent_questions: ["agent question", "agent questions"],
  chat_messages: ["chat message", "chat messages"],
  status_requests: ["status request", "status requests"],
  speaker_attributions: ["speaker link", "speaker links"],
  agenda_items: ["agenda item", "agenda items"],
  follow_ups: ["follow-up setting", "follow-up settings"],
  unconfirmed_decisions: ["unconfirmed decision", "unconfirmed decisions"],
  unconfirmed_actions: ["unconfirmed action", "unconfirmed actions"],
};

const plural = (n: number, [one, many]: [string, string]) => `${n} ${n === 1 ? one : many}`;

/** "12 notes, 3 promises and 1 access token removed", from the server's counts; zero counts are
 *  left out, and nothing at all reads "Nothing was left to erase". */
export function erasureSummary(r: { erased?: Record<string, number>; revoked_tokens?: number; revoked_share_links?: number }): string {
  const parts: string[] = [];
  for (const [key, n] of Object.entries(r.erased ?? {})) {
    if (n > 0) parts.push(plural(n, ERASED_LABEL[key] ?? [key.replace(/_/g, " "), key.replace(/_/g, " ")]));
  }
  if ((r.revoked_tokens ?? 0) > 0) parts.push(plural(r.revoked_tokens ?? 0, ["access token", "access tokens"]));
  if ((r.revoked_share_links ?? 0) > 0) parts.push(plural(r.revoked_share_links ?? 0, ["share link", "share links"]));
  if (parts.length === 0) return "Nothing was left to erase";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${list} removed`;
}

/** Copy for an erasure the server refused, keyed by status and `reason`. */
export function erasureErrorMessage(kind: ErasureKind, status: number, reason: string | null): string {
  if (reason === "confirmation_mismatch") return kind === "person" ? "That is not the person's email. Nothing was erased." : "That is not the meeting's title. Nothing was erased.";
  if (reason === "self") return "You cannot erase your own data from the console. Ask another admin.";
  if (reason === "meeting_live") return "The meeting is live. End it, then erase its data.";
  if (status === 404) return kind === "person" ? "That person is not in this workspace." : "That meeting is not in this workspace.";
  if (status === 403) return "Only workspace owners and admins can erase data.";
  return "The erasure could not finish just now. Nothing is lost by trying again: what was already erased stays erased.";
}

/* Per-store progress (wave 3). core-api's share finishes inside the request; the other stores
   each report back when their service has run, so a new erasure reads "in progress" for a short
   while. The server sends `progress` (`in_progress` | `completed`, across every store) and
   `stores`; `status` stays `completed` (core-api applied the request). These helpers name them. */

export type ErasureStoreRow = { store: string; status: "pending" | "completed"; completed_at?: string | null; counts?: Record<string, number> };

const STORE_LABEL: Record<string, { name: string; help: string }> = {
  core_api: { name: "Workspace records", help: "Notes, promises, chat, agent memory and links" },
  transcript_chunks: { name: "Transcripts", help: "What was said, or who said it" },
  vectors: { name: "AI search index", help: "What Ask and your agents search by meaning" },
  search_index: { name: "Keyword search", help: "What search finds by words" },
  knowledge_graph: { name: "Knowledge graph", help: "Links between people, decisions and topics" },
};

export const STORE_ORDER = ["core_api", "transcript_chunks", "vectors", "search_index", "knowledge_graph"];

export function storeLabel(store: string): { name: string; help: string } {
  return STORE_LABEL[store] ?? { name: store.replace(/_/g, " "), help: "" };
}

/** The stores in their fixed order, unknown ones last. */
export function orderedStores(stores: ErasureStoreRow[] | undefined): ErasureStoreRow[] {
  const rank = (s: string) => {
    const i = STORE_ORDER.indexOf(s);
    return i === -1 ? STORE_ORDER.length : i;
  };
  return [...(stores ?? [])].sort((a, b) => rank(a.store) - rank(b.store));
}

/** "3 of 5 stores done" / "Finished in every store". */
export function erasureProgress(r: { progress?: string; stores?: ErasureStoreRow[] }): { done: number; total: number; finished: boolean; label: string } {
  const stores = r.stores ?? [];
  const done = stores.filter((s) => s.status === "completed").length;
  const total = stores.length;
  const finished = r.progress !== "in_progress" && (total === 0 || done === total);
  if (finished) return { done, total, finished, label: total > 1 ? "Finished in every store" : "Finished" };
  return { done, total, finished, label: `${done} of ${total} stores done` };
}

/** True when any listed erasure is still waiting on a store (the page then refreshes itself). */
export function anyInProgress(rows: { progress?: string }[]): boolean {
  return rows.some((r) => r.progress === "in_progress");
}
