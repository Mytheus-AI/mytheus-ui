"use server";

import { revalidatePath } from "next/cache";
import { api, ApiError } from "@/lib/api/client";
import {
  BRAIN_LIMITS,
  BRAIN_PATHS,
  fieldFromDetail,
  isUuid,
  normalizeGoal,
  normalizeGroundRules,
  normalizeList,
  normalizeOrgProfile,
  normalizeOwner,
  normalizeReadiness,
  normalizeTemplate,
  normalizeTerm,
  sortGoals,
  sortTerms,
  validateGoal,
  validateGroundRules,
  validateOrgProfile,
  validateOwner,
  validateTemplate,
  validateTerm,
  type FieldErrors,
  type GlossaryTerm,
  type GlossaryTermInput,
  type GroundRules,
  type MeetingTemplate,
  type OrgGoal,
  type OrgProfile,
  type Readiness,
  type TopicOwner,
} from "@/lib/api/org-brain-types";

/* Writes to the company brain (ADR-0039 A1 to A5) and the meeting types (B1). Owner and admin
   only: the API enforces the tier and the tenant; the gate in the UI is a courtesy. Every input
   is checked again here with the same validators the forms use, because a server action is a
   public endpoint. `api()` adds the session token and an Idempotency-Key to every write.

   Each action returns a result union, never throws, so an optimistic editor can roll back with
   the server's own reason. */

export type BrainResult<T, F extends string = string> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: FieldErrors<F>; gone?: boolean };

function refresh() {
  revalidatePath("/tenant/brain", "layout");
  revalidatePath("/tenant");
  revalidatePath("/welcome");
}

function failure<F extends string>(err: unknown, verb: string, fields: readonly F[] = []): BrainResult<never, F> {
  if (err instanceof ApiError) {
    if (err.isAuthFailure) return { ok: false, message: "Your session ended. Sign in again, then try once more." };
    if (err.status === 403) return { ok: false, message: "Only workspace owners and admins can change the company brain." };
    if (err.status === 404) return { ok: false, message: "That is no longer here. It may have been removed in another tab.", gone: true };
    const prose = err.message && !/^HTTP \d+$/.test(err.message) ? err.message : "";
    if (err.status === 409) return { ok: false, message: prose || "Something with that name is already there." };
    if (err.status === 422) {
      const field = fieldFromDetail(prose, fields);
      const message = prose ? `Not accepted: ${prose}` : "Some details were not accepted. Check them and try again.";
      return field ? { ok: false, message, fieldErrors: { [field]: message } as FieldErrors<F> } : { ok: false, message };
    }
  }
  return { ok: false, message: `Could not ${verb} just now. Try again in a moment.` };
}

const invalid = <F extends string>(errors: FieldErrors<F>): BrainResult<never, F> => ({
  ok: false,
  message: Object.values(errors).find(Boolean) as string,
  fieldErrors: errors,
});

const badId: BrainResult<never> = { ok: false, message: "That item is no longer here.", gone: true };

/* ---------------- about ---------------- */

export async function saveOrgProfile(input: {
  description: string;
  industry: string;
  products: string[];
  customers: string[];
}): Promise<BrainResult<OrgProfile>> {
  const checked = validateOrgProfile(input);
  if (!checked.ok) return invalid(checked.errors);
  try {
    const saved = await api<unknown>(BRAIN_PATHS.profile, { method: "PUT", body: checked.value });
    refresh();
    return { ok: true, data: saved ? normalizeOrgProfile(saved) : { ...normalizeOrgProfile(checked.value) } };
  } catch (err) {
    return failure(err, "save the company profile", ["description", "industry", "products", "customers"]);
  }
}

/* ---------------- vocabulary ---------------- */

const TERM_FIELDS = ["term", "kind", "definition", "aliases"] as const;

async function glossaryNow(): Promise<GlossaryTerm[]> {
  return sortTerms(normalizeList(await api<unknown>(BRAIN_PATHS.glossary), normalizeTerm));
}

export async function createTerm(input: GlossaryTermInput): Promise<BrainResult<GlossaryTerm>> {
  const checked = validateTerm({ ...input, definition: input.definition ?? "" });
  if (!checked.ok) return invalid(checked.errors);
  try {
    let term = normalizeTerm(await api<unknown>(BRAIN_PATHS.glossary, { method: "POST", body: checked.value }));
    if (!term) term = (await glossaryNow()).find((t) => t.term.toLowerCase() === checked.value.term.toLowerCase()) ?? null;
    refresh();
    return term ? { ok: true, data: term } : { ok: false, message: "Saved, but it could not be read back. Reload the page." };
  } catch (err) {
    return failure(err, "add the term", TERM_FIELDS);
  }
}

export async function updateTerm(id: string, input: GlossaryTermInput): Promise<BrainResult<GlossaryTerm>> {
  if (!isUuid(id)) return badId;
  const checked = validateTerm({ ...input, definition: input.definition ?? "" });
  if (!checked.ok) return invalid(checked.errors);
  try {
    const raw = await api<unknown>(`${BRAIN_PATHS.glossary}/${id}`, { method: "PATCH", body: checked.value });
    refresh();
    const term = normalizeTerm(raw);
    return { ok: true, data: term ?? { id, ...checked.value, created_at: "", updated_at: "" } };
  } catch (err) {
    return failure(err, "save the term", TERM_FIELDS);
  }
}

export async function deleteTerm(id: string): Promise<BrainResult<null>> {
  if (!isUuid(id)) return badId;
  try {
    await api(`${BRAIN_PATHS.glossary}/${id}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return failure(err, "remove the term");
  }
  refresh();
  return { ok: true, data: null };
}

/**
 * `POST /org/glossary/import` (upsert by term, up to 200), then the whole list read back, so the
 * table shows exactly what the server kept.
 */
export async function importTerms(rows: GlossaryTermInput[]): Promise<BrainResult<GlossaryTerm[]>> {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, message: "There is nothing to import yet." };
  if (rows.length > BRAIN_LIMITS.glossary.importMax)
    return { ok: false, message: `Import up to ${BRAIN_LIMITS.glossary.importMax} terms at a time.` };
  const terms: GlossaryTermInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const c = validateTerm({ term: r?.term ?? "", kind: r?.kind ?? "", definition: r?.definition ?? "", aliases: r?.aliases ?? [] });
    if (!c.ok) return { ok: false, message: `Line ${i + 1}: ${Object.values(c.errors).find(Boolean)}` };
    terms.push(c.value);
  }
  try {
    await api(BRAIN_PATHS.glossaryImport, { method: "POST", body: { terms } });
    const list = await glossaryNow();
    refresh();
    return { ok: true, data: list };
  } catch (err) {
    return failure(err, "import the list");
  }
}

/* ---------------- who owns what ---------------- */

const OWNER_FIELDS = ["topic", "owner_user_id"] as const;

export async function createOwner(input: { topic: string; owner_user_id: string }): Promise<BrainResult<TopicOwner>> {
  const checked = validateOwner(input);
  if (!checked.ok) return invalid(checked.errors);
  if (!isUuid(checked.value.owner_user_id)) return invalid({ owner_user_id: "Pick someone from the workspace." });
  try {
    let owner = normalizeOwner(await api<unknown>(BRAIN_PATHS.owners, { method: "POST", body: checked.value }));
    if (!owner) {
      const list = normalizeList(await api<unknown>(BRAIN_PATHS.owners), normalizeOwner);
      owner = list.find((o) => o.topic.toLowerCase() === checked.value.topic.toLowerCase()) ?? null;
    }
    refresh();
    return owner ? { ok: true, data: owner } : { ok: false, message: "Saved, but it could not be read back. Reload the page." };
  } catch (err) {
    return failure(err, "add the owner", OWNER_FIELDS);
  }
}

export async function updateOwner(id: string, input: { topic: string; owner_user_id: string }): Promise<BrainResult<TopicOwner>> {
  if (!isUuid(id)) return badId;
  const checked = validateOwner(input);
  if (!checked.ok) return invalid(checked.errors);
  if (!isUuid(checked.value.owner_user_id)) return invalid({ owner_user_id: "Pick someone from the workspace." });
  try {
    const raw = await api<unknown>(`${BRAIN_PATHS.owners}/${id}`, { method: "PATCH", body: checked.value });
    refresh();
    return { ok: true, data: normalizeOwner(raw) ?? { id, ...checked.value, created_at: "" } };
  } catch (err) {
    return failure(err, "save the owner", OWNER_FIELDS);
  }
}

export async function deleteOwner(id: string): Promise<BrainResult<null>> {
  if (!isUuid(id)) return badId;
  try {
    await api(`${BRAIN_PATHS.owners}/${id}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return failure(err, "remove the owner");
  }
  refresh();
  return { ok: true, data: null };
}

/* ---------------- goals ---------------- */

const GOAL_FIELDS = ["title", "description", "period", "status", "owner_user_id"] as const;

type GoalInput = { title: string; description: string | null; period: string | null; status: string; owner_user_id: string | null };

function checkGoal(input: GoalInput) {
  // The active cap is the server's to count across every goal; the form checks it with the list.
  const checked = validateGoal({
    title: input.title ?? "",
    description: input.description ?? "",
    period: input.period ?? "",
    status: input.status,
    owner_user_id: input.owner_user_id,
  });
  if (checked.ok && checked.value.owner_user_id && !isUuid(checked.value.owner_user_id))
    return { ok: false as const, errors: { owner_user_id: "Pick someone from the workspace." } };
  return checked;
}

export async function createGoal(input: GoalInput & { position: number }): Promise<BrainResult<OrgGoal>> {
  const checked = checkGoal(input);
  if (!checked.ok) return invalid(checked.errors);
  const position = Number.isInteger(input.position) && input.position >= 0 ? input.position : 0;
  try {
    let goal = normalizeGoal(await api<unknown>(BRAIN_PATHS.goals, { method: "POST", body: { ...checked.value, position } }));
    if (!goal) {
      const list = sortGoals(normalizeList(await api<unknown>(BRAIN_PATHS.goals), normalizeGoal));
      goal = list.filter((g) => g.title === checked.value.title).pop() ?? null;
    }
    refresh();
    return goal ? { ok: true, data: goal } : { ok: false, message: "Saved, but it could not be read back. Reload the page." };
  } catch (err) {
    return failure(err, "add the goal", GOAL_FIELDS);
  }
}

export async function updateGoal(id: string, input: GoalInput): Promise<BrainResult<OrgGoal>> {
  if (!isUuid(id)) return badId;
  const checked = checkGoal(input);
  if (!checked.ok) return invalid(checked.errors);
  try {
    const raw = await api<unknown>(`${BRAIN_PATHS.goals}/${id}`, { method: "PATCH", body: checked.value });
    refresh();
    const goal = normalizeGoal(raw);
    return goal ? { ok: true, data: goal } : { ok: false, message: "Saved, but it could not be read back. Reload the page." };
  } catch (err) {
    return failure(err, "save the goal", GOAL_FIELDS);
  }
}

export async function deleteGoal(id: string): Promise<BrainResult<null>> {
  if (!isUuid(id)) return badId;
  try {
    await api(`${BRAIN_PATHS.goals}/${id}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return failure(err, "remove the goal");
  }
  refresh();
  return { ok: true, data: null };
}

/** Write the new `position` of every goal that moved, then read the order back. */
export async function reorderGoals(patches: { id: string; position: number }[]): Promise<BrainResult<OrgGoal[]>> {
  if (!Array.isArray(patches) || patches.some((p) => !isUuid(p?.id) || !Number.isInteger(p?.position) || p.position < 0))
    return { ok: false, message: "That order could not be saved. Reload and try again." };
  try {
    await Promise.all(patches.map((p) => api(`${BRAIN_PATHS.goals}/${p.id}`, { method: "PATCH", body: { position: p.position } })));
    const list = sortGoals(normalizeList(await api<unknown>(BRAIN_PATHS.goals), normalizeGoal));
    refresh();
    return { ok: true, data: list };
  } catch (err) {
    return failure(err, "save the new order");
  }
}

/* ---------------- ground rules ---------------- */

export async function saveGroundRules(topics: string[]): Promise<BrainResult<GroundRules>> {
  const checked = validateGroundRules(Array.isArray(topics) ? topics.filter((t) => typeof t === "string") : []);
  if (!checked.ok) return invalid(checked.errors);
  try {
    const raw = await api<unknown>(BRAIN_PATHS.groundRules, { method: "PUT", body: checked.value });
    refresh();
    return { ok: true, data: raw ? normalizeGroundRules(raw) : checked.value };
  } catch (err) {
    return failure(err, "save the ground rules", ["never_record_topics"]);
  }
}

/* ---------------- meeting types ---------------- */

const TEMPLATE_FIELDS = ["name", "description", "default_duration_minutes", "agenda"] as const;

type TemplateInput = {
  name: string;
  description: string;
  default_duration_minutes: number;
  agenda: { title: string; duration_minutes: number | null }[];
  confidential: boolean;
};

function checkTemplate(input: TemplateInput) {
  return validateTemplate({
    name: input?.name ?? "",
    description: input?.description ?? "",
    default_duration_minutes: input?.default_duration_minutes ?? 0,
    agenda: Array.isArray(input?.agenda) ? input.agenda : [],
    confidential: input?.confidential === true,
  });
}

export async function createTemplate(input: TemplateInput): Promise<BrainResult<MeetingTemplate>> {
  const checked = checkTemplate(input);
  if (!checked.ok) return invalid(checked.errors);
  try {
    let tpl = normalizeTemplate(await api<unknown>(BRAIN_PATHS.templates, { method: "POST", body: checked.value }));
    if (!tpl) {
      const list = normalizeList(await api<unknown>(BRAIN_PATHS.templates), normalizeTemplate);
      tpl = list.find((t) => t.name.toLowerCase() === checked.value.name.toLowerCase()) ?? null;
    }
    refresh();
    return tpl ? { ok: true, data: tpl } : { ok: false, message: "Saved, but it could not be read back. Reload the page." };
  } catch (err) {
    return failure(err, "add the meeting type", TEMPLATE_FIELDS);
  }
}

export async function updateTemplate(id: string, input: TemplateInput): Promise<BrainResult<MeetingTemplate>> {
  if (!isUuid(id)) return badId;
  const checked = checkTemplate(input);
  if (!checked.ok) return invalid(checked.errors);
  try {
    const raw = await api<unknown>(`${BRAIN_PATHS.templates}/${id}`, { method: "PATCH", body: checked.value });
    refresh();
    const tpl = normalizeTemplate(raw);
    return tpl
      ? { ok: true, data: tpl }
      : { ok: true, data: { id, ...checked.value, created_by: null, created_at: "", updated_at: "" } };
  } catch (err) {
    return failure(err, "save the meeting type", TEMPLATE_FIELDS);
  }
}

export async function deleteTemplate(id: string): Promise<BrainResult<null>> {
  if (!isUuid(id)) return badId;
  try {
    await api(`${BRAIN_PATHS.templates}/${id}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) return failure(err, "remove the meeting type");
  }
  refresh();
  return { ok: true, data: null };
}

/* ---------------- readiness ---------------- */

/** The server's readiness, for the end of the first-run setup. Null when it cannot be read. */
export async function loadReadiness(): Promise<Readiness | null> {
  try {
    return normalizeReadiness(await api<unknown>(BRAIN_PATHS.readiness));
  } catch {
    return null;
  }
}
