"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api/client";
import { fetchFollowUp, fetchMinutes, fetchShareLinks, type Read } from "@/lib/api/minutes";
import {
  EXPIRY_CHOICES,
  MAX_GUESTS,
  composerProblem,
  isEmail,
  shareFailure,
  type FollowUp,
  type FollowUpDispatch,
  type MinutesView,
  type ShareFailure,
  type ShareLink,
} from "@/components/minutes/minutes-model";

/* Minutes for everyone: the writes (share links, the follow-up) and the re-reads the client
   islands poll. Every call goes through `api()`, which attaches the session token and an
   Idempotency-Key; nothing about the tenant or the user is taken from the input. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const seg = (id: string) => encodeURIComponent(id);

function bad<T>(): Read<T> {
  return { ok: false, reason: "none" };
}

/** Re-read the minutes (the card polls this while they are being written). */
export async function loadMinutes(meetingId: string): Promise<Read<MinutesView>> {
  if (!UUID.test(meetingId)) return bad();
  return fetchMinutes(meetingId);
}

export async function loadFollowUp(meetingId: string): Promise<Read<FollowUp>> {
  if (!UUID.test(meetingId)) return bad();
  return fetchFollowUp(meetingId);
}

export async function loadShareLinks(meetingId: string): Promise<Read<ShareLink[]>> {
  if (!UUID.test(meetingId)) return bad();
  return fetchShareLinks(meetingId);
}

export type CreateLinkResult = { ok: true; link: ShareLink } | { ok: false; failure: ShareFailure };

/** `POST /api/v1/meetings/{id}/share-links`: a public recap link. A confidential meeting's host
 *  must confirm (`confirmConfidential`); without it the answer is `confirm`. */
export async function createRecapLink(
  meetingId: string,
  input: { expiresInDays: number; confirmConfidential: boolean },
): Promise<CreateLinkResult> {
  if (!UUID.test(meetingId)) return { ok: false, failure: "error" };
  const days = EXPIRY_CHOICES.some((c) => c.days === input.expiresInDays) ? input.expiresInDays : 30;
  try {
    const link = await api<ShareLink>(`/api/v1/meetings/${seg(meetingId)}/share-links`, {
      method: "POST",
      body: { expires_in_days: days, confirm_confidential: input.confirmConfidential === true },
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, link };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, failure: shareFailure(error.status, error.reason, error.code) };
    }
    return { ok: false, failure: "error" };
  }
}

/** `DELETE /api/v1/share-links/{id}`: turn a link off at once (idempotent). */
export async function revokeShareLink(meetingId: string, linkId: string): Promise<{ ok: boolean }> {
  if (!UUID.test(meetingId) || !UUID.test(linkId)) return { ok: false };
  try {
    await api<void>(`/api/v1/share-links/${seg(linkId)}`, { method: "DELETE" });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export type SendFollowUpInput = { subject?: string; body?: string; guest_emails?: string[] };
export type SendFollowUpResult = { ok: true; result: FollowUpDispatch } | { ok: false; message: string };

/** `POST /api/v1/meetings/{id}/follow-up/send` with the composer's text. Only fields the host
 *  changed are sent; the server fills the rest from the draft and the saved guests. */
export async function sendFollowUp(meetingId: string, input: SendFollowUpInput): Promise<SendFollowUpResult> {
  if (!UUID.test(meetingId)) return { ok: false, message: "That meeting could not be found." };
  const body: SendFollowUpInput = {};
  if (typeof input.subject === "string") body.subject = input.subject.trim();
  if (typeof input.body === "string") body.body = input.body;
  if (Array.isArray(input.guest_emails)) {
    const guests = Array.from(new Set(input.guest_emails.map((g) => String(g).trim().toLowerCase())));
    if (guests.length > MAX_GUESTS || guests.some((g) => !isEmail(g))) {
      return { ok: false, message: "Check the guest addresses." };
    }
    body.guest_emails = guests;
  }
  const problem = composerProblem({
    subject: body.subject ?? "draft",
    body: body.body ?? "draft",
    guests: body.guest_emails ?? [],
  });
  if (problem) return { ok: false, message: problem };
  try {
    const result = await api<FollowUpDispatch>(`/api/v1/meetings/${seg(meetingId)}/follow-up/send`, {
      method: "POST",
      body,
    });
    revalidatePath(`/meetings/${meetingId}`);
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 403) return { ok: false, message: "Only the meeting's host can send the follow-up." };
      if (error.status === 409) return { ok: false, message: "The follow-up can be sent once the meeting has ended." };
      if (error.status === 503) {
        return { ok: false, message: "Email delivery is unavailable right now. Nothing was sent; try again shortly." };
      }
      if (error.status === 422) return { ok: false, message: "Check the subject, message and guest addresses." };
    }
    return { ok: false, message: "The follow-up could not be sent. Try again in a moment." };
  }
}
