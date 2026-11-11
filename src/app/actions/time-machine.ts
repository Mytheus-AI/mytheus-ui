"use server";

import { ApiError } from "@/lib/api/client";
import { fetchDiff, fetchSnapshot, fetchTimeline } from "@/lib/api/time-machine";
import type { Diff, Snapshot, Timeline } from "@/lib/api/bets-types";
import { isDate } from "@/lib/time-machine";

/* The company time machine's reads, for the page's scrubber and topic box. Read only and
   participant-scoped by core-api: what comes back is what the caller was in. */

export type Loaded<T> = { ok: true; data: T } | { ok: false; message: string };

function failed(err: unknown): { ok: false; message: string } {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    if (err.status === 422) return { ok: false, message: "Pick a date in the past, and name a topic in a word or two." };
  }
  return { ok: false, message: "The time machine couldn't reach the record just now." };
}

const topicOf = (t: string | undefined) => (t ?? "").replace(/\s+/g, " ").trim().slice(0, 120);

export async function loadSnapshot(asOf: string, topic?: string): Promise<Loaded<Snapshot>> {
  if (!isDate(asOf)) return { ok: false, message: "Pick a date." };
  try {
    return { ok: true, data: await fetchSnapshot(asOf, topicOf(topic)) };
  } catch (err) {
    return failed(err);
  }
}

export async function loadDiff(from: string, to: string, topic?: string): Promise<Loaded<Diff>> {
  if (!isDate(from) || !isDate(to)) return { ok: false, message: "Pick both dates." };
  try {
    return { ok: true, data: await fetchDiff(from, to, topicOf(topic)) };
  } catch (err) {
    return failed(err);
  }
}

export async function loadTimeline(topic: string, from?: string, to?: string): Promise<Loaded<Timeline>> {
  const t = topicOf(topic);
  if (t.length < 2) return { ok: false, message: "Name a topic, such as pricing or hiring." };
  try {
    return { ok: true, data: await fetchTimeline(t, isDate(from) ? from : undefined, isDate(to) ? to : undefined) };
  } catch (err) {
    return failed(err);
  }
}
