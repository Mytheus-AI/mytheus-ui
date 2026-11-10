/**
 * In-meeting chat, persisted (polish program, Phase 0).
 *
 * Chat rides `realtime-gateway`'s socket, which relays a message to the room at once and stores it
 * in core-api (`chat_messages`), so a late joiner and the agents can read it. Three sources, merged:
 *   - live: "chat" { meetingId, userId, senderId, content, clientMsgId, sentAt };
 *   - stored: "chat-saved" { clientMsgId, id, createdAt } once core-api has the row;
 *   - history: `GET /api/v1/meetings/{id}/chat` on every (re)connect.
 * A message is the same message across them by `clientMsgId` (live and saved) and by the stored row
 * `id` (saved and history). A history row that matches a live message whose save event this client
 * missed (sent while it was reconnecting) is recognised by sender, text and a 30 s window.
 *
 * Your own message shows at once as `sending`, then `sent` (stored) or `unsaved` (everyone in the
 * room saw it, but it will not be there for late joiners), or `failed` (it never reached the room).
 *
 * Pure: no React.
 */

export type ChatDelivery = "sending" | "sent" | "unsaved" | "failed";

export interface ChatItem {
  /** Stable React key: the client message id when known, else the stored id. */
  key: string;
  clientMsgId: string | null;
  id: string | null;
  senderId: string | null;
  content: string;
  /** ISO time. */
  at: string;
  mine: boolean;
  delivery: ChatDelivery;
}

export interface ChatState {
  items: ChatItem[];
  /** Messages from others that arrived after `seenCount` was last set. */
  seenCount: number;
}

export const emptyChatState: ChatState = { items: [], seenCount: 0 };

export interface LiveChatPayload {
  meetingId?: string;
  senderId?: string;
  content?: string;
  clientMsgId?: string;
  sentAt?: string;
}

export interface ChatRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const MATCH_WINDOW_MS = 30_000;
const MAX_ITEMS = 500;

function sameMessage(a: ChatItem, row: ChatRow): boolean {
  if (a.id && a.id === row.id) return true;
  if (a.id || a.senderId !== row.user_id || a.content !== row.content.trim()) return false;
  return Math.abs(Date.parse(a.at) - Date.parse(row.created_at)) <= MATCH_WINDOW_MS;
}

function byTime(a: ChatItem, b: ChatItem): number {
  return Date.parse(a.at) - Date.parse(b.at);
}

function cap(items: ChatItem[]): ChatItem[] {
  return items.length > MAX_ITEMS ? items.slice(items.length - MAX_ITEMS) : items;
}

/** Your own message, shown at once while it goes out. */
export function addOwnMessage(
  state: ChatState,
  m: { clientMsgId: string; senderId: string | null; content: string; at: string },
): ChatState {
  const content = m.content.trim();
  if (!content) return state;
  const item: ChatItem = {
    key: m.clientMsgId,
    clientMsgId: m.clientMsgId,
    id: null,
    senderId: m.senderId,
    content,
    at: m.at,
    mine: true,
    delivery: "sending",
  };
  return { ...state, items: cap([...state.items, item]), seenCount: state.seenCount + 1 };
}

/** The gateway's ack for your message. */
export function ackOwnMessage(
  state: ChatState,
  clientMsgId: string,
  ack: { ok: boolean; persisted?: boolean } | null | undefined,
): ChatState {
  const delivery: ChatDelivery = !ack?.ok ? "failed" : ack.persisted ? "sent" : "unsaved";
  let changed = false;
  const items = state.items.map((it) => {
    if (it.clientMsgId !== clientMsgId || it.delivery === "sent") return it;
    changed = true;
    return { ...it, delivery };
  });
  return changed ? { ...state, items } : state;
}

/** A "chat" relay from the room (your own echo included). */
export function applyLiveChat(state: ChatState, p: LiveChatPayload | null | undefined, meId: string | null): ChatState {
  if (!p || typeof p.content !== "string" || typeof p.clientMsgId !== "string" || !p.clientMsgId) return state;
  const content = p.content.trim();
  if (!content) return state;
  if (state.items.some((it) => it.clientMsgId === p.clientMsgId)) return state;
  const mine = Boolean(meId && p.senderId === meId);
  const item: ChatItem = {
    key: p.clientMsgId,
    clientMsgId: p.clientMsgId,
    id: null,
    senderId: typeof p.senderId === "string" ? p.senderId : null,
    content,
    at: typeof p.sentAt === "string" && !Number.isNaN(Date.parse(p.sentAt)) ? p.sentAt : new Date().toISOString(),
    mine,
    delivery: "sent",
  };
  return {
    ...state,
    items: cap([...state.items, item]),
    seenCount: mine ? state.seenCount + 1 : state.seenCount,
  };
}

/** "chat-saved": core-api stored it with this row id. */
export function applyChatSaved(
  state: ChatState,
  p: { clientMsgId?: string; id?: string; createdAt?: string } | null | undefined,
): ChatState {
  if (!p || typeof p.clientMsgId !== "string" || typeof p.id !== "string") return state;
  let changed = false;
  const items = state.items.map((it) => {
    if (it.clientMsgId !== p.clientMsgId) return it;
    changed = true;
    return { ...it, id: p.id!, delivery: "sent" as const };
  });
  return changed ? { ...state, items } : state;
}

/**
 * History from core-api, merged in. Rows already shown are matched and keep their place; new
 * rows are added. On the first load nothing counts as unread; afterwards only rows from others
 * that this client had not shown do.
 */
export function hydrateChat(
  state: ChatState,
  rows: ChatRow[] | null | undefined,
  meId: string | null,
  firstLoad: boolean,
): ChatState {
  if (!Array.isArray(rows) || rows.length === 0) return state;
  const items = [...state.items];
  let added = 0;
  let addedMine = 0;
  for (const row of rows) {
    if (typeof row?.id !== "string" || typeof row.content !== "string") continue;
    const i = items.findIndex((it) => sameMessage(it, row));
    if (i >= 0) {
      if (!items[i].id) items[i] = { ...items[i], id: row.id, delivery: "sent" };
      continue;
    }
    const mine = Boolean(meId && row.user_id === meId);
    items.push({
      key: row.id,
      clientMsgId: null,
      id: row.id,
      senderId: row.user_id,
      content: row.content.trim(),
      at: row.created_at,
      mine,
      delivery: "sent",
    });
    if (mine) addedMine += 1;
    added += 1;
  }
  if (added === 0 && items.every((it, i) => it === state.items[i])) return state;
  items.sort(byTime);
  const capped = cap(items);
  return {
    items: capped,
    seenCount: firstLoad ? capped.length : state.seenCount + addedMine,
  };
}

/** Everything shown is now seen (the Chat tab is open). */
export function markChatSeen(state: ChatState): ChatState {
  return state.seenCount === state.items.length ? state : { ...state, seenCount: state.items.length };
}

/** How many messages arrived that you have not looked at. */
export function unreadCount(state: ChatState): number {
  return Math.max(0, state.items.length - state.seenCount);
}
