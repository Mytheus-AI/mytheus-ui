"use client";

import { readMeetingBlastRadius } from "@/app/actions/blast-radius";
import type { MeetingBlastItem } from "@/lib/api/why-blast-types";
import { CHIP_POLL } from "@/lib/blast-radius";

/* One poller per meeting for every blast radius chip on the screen. A chip asks for its decision;
   while any asked decision is missing or still pending, the meeting's summaries are re-read, never
   more often than every 5 s, and the poller gives up a minute after the last new ask. Each chip
   subscribes and re-renders from the shared map. */

type Entry = {
  items: Map<string, MeetingBlastItem>;
  wanted: Set<string>;
  listeners: Set<() => void>;
  timer: ReturnType<typeof setTimeout> | null;
  deadline: number;
  lastRead: number;
  failed: boolean;
  version: number;
};

const meetings = new Map<string, Entry>();

function entry(meetingId: string): Entry {
  let e = meetings.get(meetingId);
  if (!e) {
    e = { items: new Map(), wanted: new Set(), listeners: new Set(), timer: null, deadline: 0, lastRead: 0, failed: false, version: 0 };
    meetings.set(meetingId, e);
  }
  return e;
}

function settled(e: Entry): boolean {
  for (const id of Array.from(e.wanted)) {
    const it = e.items.get(id);
    if (!it || it.state === "pending") return false;
  }
  return true;
}

async function read(meetingId: string) {
  const e = entry(meetingId);
  e.timer = null;
  e.lastRead = Date.now();
  const res = await readMeetingBlastRadius(meetingId);
  if (res.ok) {
    e.failed = false;
    for (const it of res.data) e.items.set(it.decision_id, it);
  } else {
    e.failed = true;
  }
  e.version += 1;
  e.listeners.forEach((l) => l());
  schedule(meetingId);
}

function schedule(meetingId: string) {
  const e = entry(meetingId);
  if (e.timer || settled(e) || Date.now() > e.deadline || e.listeners.size === 0) return;
  const wait = Math.max(CHIP_POLL.everyMs - (Date.now() - e.lastRead), e.lastRead ? 0 : 50);
  e.timer = setTimeout(() => void read(meetingId), wait);
}

/** Ask for one decision's summary; returns the unsubscribe. */
export function watchDecision(meetingId: string, decisionId: string, onChange: () => void): () => void {
  const e = entry(meetingId);
  e.listeners.add(onChange);
  if (!e.wanted.has(decisionId)) {
    e.wanted.add(decisionId);
    e.deadline = Date.now() + CHIP_POLL.forMs;
  }
  schedule(meetingId);
  return () => {
    e.listeners.delete(onChange);
    if (e.listeners.size === 0 && e.timer) {
      clearTimeout(e.timer);
      e.timer = null;
    }
  };
}

export function snapshot(meetingId: string, decisionId: string): { item: MeetingBlastItem | null; failed: boolean; done: boolean; version: number } {
  const e = entry(meetingId);
  return { item: e.items.get(decisionId) ?? null, failed: e.failed, done: Date.now() > e.deadline && !e.timer, version: e.version };
}
