// Run: npm test
// Persisted chat (polish program, Phase 0): live relay, stored ack, history merge, unread.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ackOwnMessage,
  addOwnMessage,
  applyChatSaved,
  applyLiveChat,
  emptyChatState,
  hydrateChat,
  markChatSeen,
  unreadCount,
} from "../src/lib/realtime/chat.ts";

const ME = "me";
const RAJ = "raj";

test("your message shows at once, then is marked stored, and the echo is not doubled", () => {
  let s = addOwnMessage(emptyChatState, { clientMsgId: "c1", senderId: ME, content: " hi ", at: "2026-11-11T10:00:00Z" });
  assert.equal(s.items[0].delivery, "sending");
  s = applyLiveChat(s, { senderId: ME, content: "hi", clientMsgId: "c1", sentAt: "2026-11-11T10:00:00Z" }, ME);
  assert.equal(s.items.length, 1);
  s = ackOwnMessage(s, "c1", { ok: true, persisted: true });
  assert.equal(s.items[0].delivery, "sent");
  assert.equal(unreadCount(s), 0, "your own messages are never unread");
});

test("a message the room saw but core-api did not store says so; a refused one failed", () => {
  let s = addOwnMessage(emptyChatState, { clientMsgId: "c1", senderId: ME, content: "a", at: "2026-11-11T10:00:00Z" });
  s = addOwnMessage(s, { clientMsgId: "c2", senderId: ME, content: "b", at: "2026-11-11T10:00:01Z" });
  s = ackOwnMessage(s, "c1", { ok: true, persisted: false });
  s = ackOwnMessage(s, "c2", { ok: false });
  assert.deepEqual(s.items.map((i) => i.delivery), ["unsaved", "failed"]);
});

test("others' messages count as unread until the Chat tab is seen", () => {
  let s = applyLiveChat(emptyChatState, { senderId: RAJ, content: "hello", clientMsgId: "r1", sentAt: "2026-11-11T10:00:00Z" }, ME);
  s = applyLiveChat(s, { senderId: RAJ, content: "there", clientMsgId: "r2", sentAt: "2026-11-11T10:00:02Z" }, ME);
  assert.equal(unreadCount(s), 2);
  s = markChatSeen(s);
  assert.equal(unreadCount(s), 0);
});

test("history merges by stored id and by sender, text and time; a late joiner sees it all as read", () => {
  let s = applyLiveChat(emptyChatState, { senderId: RAJ, content: "hello", clientMsgId: "r1", sentAt: "2026-11-11T10:00:00Z" }, ME);
  s = applyChatSaved(s, { clientMsgId: "r1", id: "row-1", createdAt: "2026-11-11T10:00:00Z" });
  s = applyLiveChat(s, { senderId: RAJ, content: "missed save", clientMsgId: "r2", sentAt: "2026-11-11T10:00:05Z" }, ME);
  s = markChatSeen(s);
  s = hydrateChat(
    s,
    [
      { id: "row-0", user_id: RAJ, content: "earlier", created_at: "2026-11-11T09:59:00Z" },
      { id: "row-1", user_id: RAJ, content: "hello", created_at: "2026-11-11T10:00:00Z" },
      { id: "row-2", user_id: RAJ, content: "missed save", created_at: "2026-11-11T10:00:06Z" },
    ],
    ME,
    false,
  );
  assert.deepEqual(s.items.map((i) => i.content), ["earlier", "hello", "missed save"]);
  assert.equal(s.items[2].id, "row-2");
  assert.equal(unreadCount(s), 1, "the one row this client had never shown is new");

  const late = hydrateChat(emptyChatState, [{ id: "row-0", user_id: RAJ, content: "earlier", created_at: "2026-11-11T09:59:00Z" }], ME, true);
  assert.equal(unreadCount(late), 0);
});

test("malformed live payloads are ignored", () => {
  assert.equal(applyLiveChat(emptyChatState, { content: "x" }, ME), emptyChatState);
  assert.equal(applyLiveChat(emptyChatState, { content: "  ", clientMsgId: "a" }, ME), emptyChatState);
});
