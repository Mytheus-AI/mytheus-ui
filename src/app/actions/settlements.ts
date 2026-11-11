"use server";

import { revalidatePath } from "next/cache";
import { fetchSettleSlot, fetchSettlement, postSettleBook, settleWrite } from "@/lib/api/settlements";
import { failure } from "@/lib/api/why-blast-call";
import type { Act, BookedMeeting, Load, Settlement, SlotProposal } from "@/lib/api/why-blast-types";
import { isUuid } from "@/lib/decision-why";
import { checkKeepNote, checkMessage, settleRoutes, type SettleReq } from "@/lib/settlements";

/* A settle thread between the owners of two clashing decisions. Only those two can read or act
   (core-api answers 404 to anyone else). Every write answers the whole thread as it now is; a
   repeat of the same outcome is a no-op, a different one after a final outcome is 409, and then
   the thread is read back so the screen shows what actually happened. */

const gone = { ok: false as const, code: "gone" as const, message: "This thread is no longer here." };

async function write(id: string, req: SettleReq, invalid?: string): Promise<Act<Settlement>> {
  try {
    const data = await settleWrite(req);
    revalidatePath("/work/settle");
    return { ok: true, data };
  } catch (err) {
    const f = failure(err, "This thread", invalid);
    if (f.code === "conflict") {
      const now = await fetchSettlement(id);
      if (now.ok) return { ok: true, data: now.data };
    }
    if (f.code === "forbidden") return { ...f, message: "Only the other owner can do that." };
    return f;
  }
}

export async function readSettlement(id: string): Promise<Load<Settlement>> {
  if (!isUuid(id)) return { ok: false, reason: "none" };
  return fetchSettlement(id);
}

export async function sendSettleMessage(id: string, body: string): Promise<Act<Settlement>> {
  if (!isUuid(id)) return gone;
  const check = checkMessage(body);
  if (!check.ok) return { ok: false, code: "invalid", message: check.message };
  return write(id, settleRoutes.message(id, check.body));
}

export async function shareSettleWording(id: string): Promise<Act<Settlement>> {
  if (!isUuid(id)) return gone;
  return write(id, settleRoutes.share(id));
}

export async function keepBothDecisions(id: string, note: string): Promise<Act<Settlement>> {
  if (!isUuid(id)) return gone;
  const check = checkKeepNote(note);
  if (!check.ok) return { ok: false, code: "invalid", message: check.message };
  return write(id, settleRoutes.keepBoth(id, check.note));
}

export async function supersedeDecision(id: string, winnerDecisionId: string): Promise<Act<Settlement>> {
  if (!isUuid(id) || !isUuid(winnerDecisionId)) return gone;
  return write(id, settleRoutes.supersede(id, winnerDecisionId));
}

export async function acceptSettleProposal(id: string): Promise<Act<Settlement>> {
  if (!isUuid(id)) return gone;
  return write(id, settleRoutes.accept(id));
}

export async function declineSettleProposal(id: string): Promise<Act<Settlement>> {
  if (!isUuid(id)) return gone;
  return write(id, settleRoutes.decline(id));
}

export async function readSettleSlot(id: string): Promise<Act<SlotProposal>> {
  if (!isUuid(id)) return gone;
  try {
    return { ok: true, data: await fetchSettleSlot(id) };
  } catch (err) {
    const f = failure(err, "This thread");
    return f.code === "error" ? { ...f, message: "Your agent couldn't find a time just now. Try again in a moment." } : f;
  }
}

export async function bookSettleMeeting(id: string, start: string | null): Promise<Act<BookedMeeting>> {
  if (!isUuid(id)) return gone;
  if (start !== null && Number.isNaN(Date.parse(start))) return { ok: false, code: "invalid", message: "Pick a time for the meeting." };
  try {
    const data = await postSettleBook(id, start);
    revalidatePath("/work/settle");
    return { ok: true, data };
  } catch (err) {
    return failure(err, "This thread", "That time doesn't work. Pick a time at least two hours from now.");
  }
}
