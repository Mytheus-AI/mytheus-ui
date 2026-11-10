"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { deleteShareLink, postDecisionExport, postDecisionShareLink, type DecisionExportRequest } from "@/lib/api/decision-reach";
import { exportErrorMessage, shareErrorMessage, slackChannel, type ExportProvider } from "@/lib/decision-reach";
import { safeHttpsUrl } from "@/lib/integrations";

/* Export a decision record to Notion, Confluence or Slack, and create or revoke its share link.
   The record is built by the server as the caller may see it, lineage included; the browser
   sends only the decision id and where it should go. */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOTION_ID = /^[0-9a-fA-F-]{1,64}$/;
const SPACE_KEY = /^[A-Za-z0-9~_-]{1,255}$/;

export type ExportResult = { ok: true; url: string | null; replaced: boolean } | { ok: false; message: string };

export async function exportDecision(input: {
  decisionId: string;
  meetingId: string;
  provider: ExportProvider;
  destination: string;
}): Promise<ExportResult> {
  if (!UUID.test(input.decisionId)) return { ok: false, message: "That decision does not exist." };
  const body: DecisionExportRequest = { provider: input.provider };
  if (input.provider === "notion") {
    if (!NOTION_ID.test(input.destination)) return { ok: false, message: "Pick the Notion page to put it under." };
    body.parent_page_id = input.destination;
  } else if (input.provider === "confluence") {
    if (!SPACE_KEY.test(input.destination)) return { ok: false, message: "Pick the Confluence space to put it in." };
    body.space_key = input.destination;
  } else {
    const channel = slackChannel(input.destination === "dm" ? "" : input.destination);
    if (!channel.ok) return { ok: false, message: channel.message };
    if (channel.channel) body.channel = channel.channel;
  }
  try {
    const res = await postDecisionExport(input.decisionId, body);
    if (UUID.test(input.meetingId)) revalidatePath(`/meetings/${input.meetingId}/decisions/${input.decisionId}`);
    return { ok: true, url: safeHttpsUrl(res.external_url), replaced: res.replaced };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      return { ok: false, message: exportErrorMessage(input.provider, err.status, err.reason) };
    }
    return { ok: false, message: exportErrorMessage(input.provider, 0, null) };
  }
}

export type ShareResult = { ok: true; id: string; url: string } | { ok: false; message: string };

export async function createDecisionShare(decisionId: string, meetingId: string): Promise<ShareResult> {
  if (!UUID.test(decisionId)) return { ok: false, message: "That decision does not exist." };
  try {
    const link = await postDecisionShareLink(decisionId);
    const url = safeHttpsUrl(link.url) ?? (link.url.startsWith("http://localhost") ? link.url : null);
    if (!url) return { ok: false, message: "The share link came back in an unexpected form. Try again." };
    if (UUID.test(meetingId)) revalidatePath(`/meetings/${meetingId}/decisions/${decisionId}`);
    return { ok: true, id: link.id, url };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
      return { ok: false, message: shareErrorMessage(err.status, err.reason) };
    }
    return { ok: false, message: shareErrorMessage(0, null) };
  }
}

export type RevokeShareResult = { ok: true } | { ok: false; message: string };

export async function revokeDecisionShare(linkId: string, decisionId: string, meetingId: string): Promise<RevokeShareResult> {
  if (!UUID.test(linkId)) return { ok: false, message: "That link does not exist." };
  try {
    await deleteShareLink(linkId);
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      return { ok: false, message: "The link could not be turned off just now. Try again." };
    }
  }
  if (UUID.test(meetingId) && UUID.test(decisionId)) revalidatePath(`/meetings/${meetingId}/decisions/${decisionId}`);
  return { ok: true };
}
