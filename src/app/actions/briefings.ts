"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api/client";
import type { Briefing, BriefingPreferences, BriefingSettings } from "@/lib/briefing";

/* A briefing from your agent: "Brief me", polling while the agent writes, marking it heard, the
   server voice's short-lived URL, and the person's briefing preferences (including the voice the
   player remembers for them). Every call is the caller's own: core-api keys it on the verified
   user, so nothing here names a person. */

export type BriefingResult = { ok: true; briefing: Briefing } | { ok: false; message: string; status?: number };
export type AudioResult = { ok: true; url: string; expiresAt: string } | { ok: false; message: string };
export type SettingsResult = { ok: true; settings: BriefingSettings } | { ok: false; message: string };

function failure(err: unknown, fallback: string): { ok: false; message: string; status?: number } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again.", status: err.status };
    if (err.status === 429) return { ok: false, message: "That is a lot of briefings for one hour. Try again a little later.", status: 429 };
    if (err.status === 409) return { ok: false, message: "Your agent can brief you once the meeting has ended.", status: 409 };
    if (err.status === 403) return { ok: false, message: "Only people who were in this meeting get a briefing about it.", status: 403 };
    if (err.status === 404) return { ok: false, message: "That briefing is no longer available.", status: 404 };
    if (err.status === 422) return { ok: false, message: "That setting could not be saved as chosen.", status: 422 };
  }
  return { ok: false, message: fallback };
}

const UUID = /^[0-9a-f-]{36}$/i;

export async function briefMe(meetingId?: string | null): Promise<BriefingResult> {
  if (meetingId && !UUID.test(meetingId)) return { ok: false, message: "That meeting could not be found." };
  try {
    const briefing = await api<Briefing>("/api/v1/briefings", {
      method: "POST",
      body: meetingId ? { meeting_id: meetingId } : {},
    });
    return { ok: true, briefing };
  } catch (err) {
    return failure(err, "Your agent could not be asked just now. Try again in a moment.");
  }
}

export async function pollBriefing(id: string): Promise<BriefingResult> {
  if (!UUID.test(id)) return { ok: false, message: "That briefing could not be found." };
  try {
    return { ok: true, briefing: await api<Briefing>(`/api/v1/briefings/${encodeURIComponent(id)}`) };
  } catch (err) {
    return failure(err, "Your briefing could not be checked just now.");
  }
}

export async function markBriefingHeard(id: string): Promise<BriefingResult> {
  if (!UUID.test(id)) return { ok: false, message: "That briefing could not be found." };
  try {
    return { ok: true, briefing: await api<Briefing>(`/api/v1/briefings/${encodeURIComponent(id)}/listened`, { method: "POST" }) };
  } catch (err) {
    return failure(err, "Could not mark it heard.");
  }
}

export async function briefingAudioUrl(id: string): Promise<AudioResult> {
  if (!UUID.test(id)) return { ok: false, message: "That briefing could not be found." };
  try {
    const res = await api<{ url: string; expires_at: string }>(`/api/v1/briefings/${encodeURIComponent(id)}/audio`);
    return { ok: true, url: res.url, expiresAt: res.expires_at };
  } catch (err) {
    return failure(err, "The recorded voice could not be loaded; your device will read it instead.");
  }
}

export async function saveBriefingPreferences(prefs: BriefingPreferences): Promise<SettingsResult> {
  const body: BriefingPreferences = {
    enabled: Boolean(prefs.enabled),
    auto_play: Boolean(prefs.auto_play),
    length: prefs.length === "short" ? "short" : "standard",
    language: typeof prefs.language === "string" ? prefs.language.slice(0, 8) : "en",
    voice: typeof prefs.voice === "string" && prefs.voice.trim() ? prefs.voice.trim().slice(0, 200) : null,
    server_voice: typeof prefs.server_voice === "string" && prefs.server_voice ? prefs.server_voice.slice(0, 100) : null,
    rate: typeof prefs.rate === "number" && prefs.rate >= 0.5 && prefs.rate <= 2 ? prefs.rate : 1,
  };
  try {
    const settings = await api<BriefingSettings>("/api/v1/briefings/preferences", { method: "PUT", body });
    revalidatePath("/settings/briefings");
    return { ok: true, settings };
  } catch (err) {
    return failure(err, "Your briefing settings could not be saved just now. Nothing changed.");
  }
}
