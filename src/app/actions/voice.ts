"use server";

import { revalidatePath } from "next/cache";
import { ApiError, api } from "@/lib/api/client";
import { asVoiceId, normalizeCatalog, type VoiceCatalog } from "@/lib/voice/catalog";

/* The Myte's voice (ADR-0050 D3): the voices on offer and the person's choice. The choice is the
   same stored value as the briefing preference `server_voice`, so Your Myte and Settings >
   Briefings show one choice. Every call is the caller's own. */

export type VoiceResult = { ok: true; catalog: VoiceCatalog } | { ok: false; message: string };

function failure(err: unknown, fallback: string): { ok: false; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 422) return { ok: false, message: "That voice is not one your Myte can use." };
  }
  return { ok: false, message: fallback };
}

export async function loadVoices(): Promise<VoiceResult> {
  try {
    return { ok: true, catalog: normalizeCatalog(await api<unknown>("/api/v1/voice/voices")) };
  } catch (err) {
    return failure(err, "The voices could not be loaded just now.");
  }
}

export async function saveVoice(voice: string | null): Promise<VoiceResult> {
  const id = voice === null ? null : asVoiceId(voice);
  if (voice !== null && !id) return { ok: false, message: "That voice is not one your Myte can use." };
  try {
    const catalog = normalizeCatalog(await api<unknown>("/api/v1/voice/preference", { method: "PUT", body: { voice: id } }));
    revalidatePath("/agent");
    revalidatePath("/settings/briefings");
    return { ok: true, catalog };
  } catch (err) {
    return failure(err, "Your Myte's voice could not be saved just now. Nothing changed.");
  }
}
