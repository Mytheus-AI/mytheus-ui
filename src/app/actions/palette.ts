"use server";

import { listMeetings } from "@/lib/api/meetings";
import { listMembers } from "@/lib/api/members";
import { fetchDecisionLog } from "@/lib/api/decisions";

/* What the command palette searches beyond screens and actions: the caller's meetings, the
   workspace's people and the decision log, read once when the palette first opens. Only what the
   caller can already see (the same reads the Meetings, People and Decisions screens use), trimmed
   to what the palette shows. Each arm fails on its own (null), so the palette still searches the
   rest. */

export type PaletteIndex = {
  meetings: { id: string; title: string; start: string | null; status: string }[] | null;
  people: { id: string; name: string; email: string; isYou: boolean }[] | null;
  decisions: { id: string; meetingId: string; content: string; meetingTitle: string; at: string }[] | null;
};

export async function paletteIndex(): Promise<PaletteIndex> {
  const [meetings, people, decisions] = await Promise.all([
    listMeetings().catch(() => null),
    listMembers().catch(() => null),
    fetchDecisionLog().catch(() => null),
  ]);
  return {
    meetings:
      meetings?.slice(0, 300).map((m) => ({
        id: m.id,
        title: m.title || "Untitled meeting",
        start: m.scheduled_start ?? null,
        status: m.status,
      })) ?? null,
    people: people?.map((p) => ({ id: p.id, name: p.name, email: p.email, isYou: p.isYou })) ?? null,
    decisions:
      decisions
        ?.filter((d) => d.status !== "superseded")
        .slice(0, 300)
        .map((d) => ({ id: d.id, meetingId: d.meetingId, content: d.content, meetingTitle: d.meetingTitle, at: d.recordedAt })) ?? null,
  };
}
