/**
 * Reads for the company brain (ADR-0039 Part A, and B1's meeting types) through `api-gateway`.
 * Every read returns a result union, so one failing route degrades its own panel instead of the
 * whole page. Wrapped in `cache()`, so a layout and its page asking for the same thing in one
 * request share the round trip.
 *
 * Reads are open to every member; writes (in `app/actions/org-brain.ts`) need owner or admin.
 * Nothing about the tenant is sent: the gateway derives it from the session.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { cache } from "react";
import { apiSafe } from "./client";
import { listMembers } from "./members";
import type { MemberOption } from "@/components/org-brain/types";
import {
  BRAIN_PATHS,
  EMPTY_PROFILE,
  isOrgProfileEmpty,
  normalizeGoal,
  normalizeGroundRules,
  normalizeList,
  normalizeOrgProfile,
  normalizeOwner,
  normalizeReadiness,
  normalizeTemplate,
  normalizeTerm,
  normalizeWelcome,
  sortGoals,
  sortTerms,
  type GlossaryTerm,
  type GroundRules,
  type MeetingTemplate,
  type OrgGoal,
  type OrgProfile,
  type Readiness,
  type TopicOwner,
  type Welcome,
} from "./org-brain-types";

export type Loaded<T> = { ok: true; data: T } | { ok: false; status: number };

async function read<T>(path: string, normalize: (raw: unknown) => T, emptyOn404?: T): Promise<Loaded<T>> {
  const res = await apiSafe<unknown>(path);
  if (res.ok) return { ok: true, data: normalize(res.data) };
  // A brain that was never written can answer 404 for its single-row resources; that is
  // "nothing yet", not a failure.
  if (emptyOn404 !== undefined && res.error.status === 404) return { ok: true, data: emptyOn404 };
  return { ok: false, status: res.error.status };
}

export const fetchOrgProfile = cache(
  (): Promise<Loaded<OrgProfile>> => read(BRAIN_PATHS.profile, normalizeOrgProfile, EMPTY_PROFILE),
);

export const fetchGlossary = cache(
  (): Promise<Loaded<GlossaryTerm[]>> => read(BRAIN_PATHS.glossary, (raw) => sortTerms(normalizeList(raw, normalizeTerm))),
);

export const fetchTopicOwners = cache(
  (): Promise<Loaded<TopicOwner[]>> => read(BRAIN_PATHS.owners, (raw) => normalizeList(raw, normalizeOwner)),
);

export const fetchGoals = cache(
  (): Promise<Loaded<OrgGoal[]>> => read(BRAIN_PATHS.goals, (raw) => sortGoals(normalizeList(raw, normalizeGoal))),
);

export const fetchGroundRules = cache(
  (): Promise<Loaded<GroundRules>> =>
    read(BRAIN_PATHS.groundRules, normalizeGroundRules, { never_record_topics: [] } satisfies GroundRules),
);

/** Owner and admin only on the server; a member gets 403, which callers treat as "not shown". */
export const fetchReadiness = cache((): Promise<Loaded<Readiness>> => read(BRAIN_PATHS.readiness, normalizeReadiness));

export const fetchWelcome = cache((): Promise<Loaded<Welcome>> => read(BRAIN_PATHS.welcome, normalizeWelcome));

export const fetchMeetingTemplates = cache(
  (): Promise<Loaded<MeetingTemplate[]>> =>
    read(BRAIN_PATHS.templates, (raw) =>
      normalizeList(raw, normalizeTemplate).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    ),
);

/**
 * Whether the first-run setup should be offered: true only when the profile was read and is
 * empty. A failed read answers false, so a gateway hiccup never pushes anyone into setup.
 */
export async function orgProfileNeedsSetup(): Promise<boolean> {
  const res = await fetchOrgProfile();
  return res.ok && isOrgProfileEmpty(res.data);
}

/** The workspace's members for the brain's pickers, the caller first; null when not loaded. */
export const fetchMemberOptions = cache(async (): Promise<MemberOption[] | null> => {
  const members = await listMembers();
  return members ? members.map((m) => ({ id: m.id, name: m.name, email: m.email, imageUrl: m.imageUrl, isYou: m.isYou })) : null;
});
