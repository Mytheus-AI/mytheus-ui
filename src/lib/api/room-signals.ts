/**
 * The room-signals reads on core-api (a3 room signals contract section 4). SERVER-ONLY, through
 * `lib/api/client.ts` (the caller's own Clerk session; the gateway derives the tenant).
 *
 *   GET /api/v1/meetings/{id}/after-signals         the after page's private and shared parts
 *   GET /api/v1/meetings/{id}/late-contributions     the late points added to a meeting
 *   GET /api/v1/me/last-word?status=open|all         your nudges, for the Inbox
 *   GET /api/v1/me/agreement-checks?status=asked|all your private agreement checks, for the Inbox
 *   GET /api/v1/decisions/{id}/agreement             a decision's agreement read (owner sees counts)
 *   GET /api/v1/meetings/{id}/resume-point           the point carried in, and the one saved
 *   GET /api/v1/late-contributions/{id}/audio        a recorded point's bytes (`fetchLateAudio`)
 *
 * Each read answers `{ ok: true, data }` or `{ ok: false, reason }`: `none` when the server says
 * there is nothing for you (403, 404), `error` when it could not be read.
 */

import { auth } from "@clerk/nextjs/server";
import { apiSafe } from "@/lib/api/client";
import type {
  AfterSignals,
  AgreementCheck,
  AgreementCheckList,
  DecisionAgreement,
  LastWordList,
  LastWordNudge,
  LateContributionList,
  ResumePointRead,
} from "@/lib/api/room-signals-types";

export type SignalRead<T> = { ok: true; data: T } | { ok: false; reason: "none" | "error" };

const seg = (id: string) => encodeURIComponent(id);
const isObj = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === "object";

async function read<T>(path: string, valid: (raw: unknown) => boolean, query?: Record<string, string>): Promise<SignalRead<T>> {
  const res = await apiSafe<unknown>(path, query ? { query } : {});
  if (!res.ok) {
    const s = res.error.status;
    return { ok: false, reason: s === 403 || s === 404 ? "none" : "error" };
  }
  return valid(res.data) ? { ok: true, data: res.data as T } : { ok: false, reason: "error" };
}

export function fetchAfterSignals(meetingId: string): Promise<SignalRead<AfterSignals>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/after-signals`, (raw) => isObj(raw) && Array.isArray(raw.decisions));
}

export function fetchLateContributions(meetingId: string): Promise<SignalRead<LateContributionList>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/late-contributions`, (raw) => isObj(raw) && Array.isArray(raw.items));
}

export async function fetchMyLastWord(status: "open" | "all" = "all"): Promise<LastWordNudge[] | null> {
  const res = await read<LastWordList>("/api/v1/me/last-word", (raw) => isObj(raw) && Array.isArray(raw.items), { status });
  return res.ok ? res.data.items : null;
}

export async function fetchMyAgreementChecks(status: "asked" | "all" = "all"): Promise<AgreementCheck[] | null> {
  const res = await read<AgreementCheckList>("/api/v1/me/agreement-checks", (raw) => isObj(raw) && Array.isArray(raw.items), { status });
  return res.ok ? res.data.items : null;
}

export function fetchDecisionAgreement(decisionId: string): Promise<SignalRead<DecisionAgreement>> {
  return read(`/api/v1/decisions/${seg(decisionId)}/agreement`, (raw) => isObj(raw) && typeof raw.decision_id === "string");
}

export function fetchResumePoint(meetingId: string): Promise<SignalRead<ResumePointRead>> {
  return read(`/api/v1/meetings/${seg(meetingId)}/resume-point`, (raw) => isObj(raw) && "incoming" in raw && "saved" in raw);
}

/**
 * A recorded late contribution's bytes, fetched with the caller's session and handed back as a
 * stream (the route handler `app/api/late-contributions/[id]/audio` relays it to the browser, so
 * the token never leaves the server). `Range` is forwarded so the player can seek.
 */
export async function fetchLateAudio(id: string, range: string | null): Promise<Response> {
  const base = (process.env.API_GATEWAY_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "").replace(/\/+$/, "");
  if (!base) return new Response(null, { status: 503 });
  const { getToken } = await auth();
  const token = await getToken();
  const headers: Record<string, string> = { Accept: "audio/*" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (range) headers.Range = range;
  try {
    return await fetch(`${base}/api/v1/late-contributions/${seg(id)}/audio`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
