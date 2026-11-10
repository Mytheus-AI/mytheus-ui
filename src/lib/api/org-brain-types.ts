/**
 * The company brain of ADR-0039 Part A (and the meeting types of B1): the wire shapes of the
 * `/api/v1/org/*` and `/api/v1/meeting-templates` routes, the limits the API enforces (mirrored
 * here so a form says so before the server does), and pure helpers: tolerant normalizers, the
 * validators, the "paste a list" parser, the readiness rules and the join-date window.
 *
 * Hand-written until the generated client is regenerated from the new OpenAPI documents; names
 * and limits follow the ADR exactly. Pure (no imports), so it runs on the server, in the browser
 * and under `node --test`.
 */

/* ---------------- routes ---------------- */

export const BRAIN_PATHS = {
  profile: "/api/v1/org/profile",
  glossary: "/api/v1/org/glossary",
  glossaryImport: "/api/v1/org/glossary/import",
  owners: "/api/v1/org/topic-owners",
  goals: "/api/v1/org/goals",
  groundRules: "/api/v1/org/ground-rules",
  readiness: "/api/v1/org/readiness",
  welcome: "/api/v1/org/welcome",
  templates: "/api/v1/meeting-templates",
} as const;

/* ---------------- shapes ---------------- */

export const GLOSSARY_KINDS = ["product", "codename", "acronym", "customer", "person", "other"] as const;
export type GlossaryKind = (typeof GLOSSARY_KINDS)[number];

export const KIND_LABEL: Record<GlossaryKind, string> = {
  product: "Product",
  codename: "Codename",
  acronym: "Acronym",
  customer: "Customer",
  person: "Person",
  other: "Other",
};

export const GOAL_STATUSES = ["active", "achieved", "dropped"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  dropped: "Dropped",
};

/** A1 `org_profiles`. */
export type OrgProfile = {
  description: string;
  industry: string;
  products: string[];
  customers: string[];
  updated_by: string | null;
  updated_at: string | null;
};

export type OrgProfileUpdate = Pick<OrgProfile, "description" | "industry" | "products" | "customers">;

/** A2 `org_glossary_terms`. */
export type GlossaryTerm = {
  id: string;
  term: string;
  kind: GlossaryKind;
  definition: string | null;
  aliases: string[];
  created_at: string;
  updated_at: string;
};

export type GlossaryTermInput = {
  term: string;
  kind: GlossaryKind;
  definition: string | null;
  aliases: string[];
};

/** A3 `topic_owners`. */
export type TopicOwner = { id: string; topic: string; owner_user_id: string; created_at: string };
export type TopicOwnerInput = { topic: string; owner_user_id: string };

/** A4 `org_goals`. */
export type OrgGoal = {
  id: string;
  title: string;
  description: string | null;
  period: string | null;
  status: GoalStatus;
  owner_user_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type OrgGoalInput = {
  title: string;
  description: string | null;
  period: string | null;
  status: GoalStatus;
  owner_user_id: string | null;
};

/** A5. */
export type GroundRules = { never_record_topics: string[] };

/** A7. */
export const READINESS_KEYS = ["profile", "vocabulary", "owners", "goals", "ground_rules", "roles"] as const;
export type ReadinessKey = (typeof READINESS_KEYS)[number];
export type ReadinessCheck = { key: string; label: string; done: boolean; detail: string };
export type Readiness = { score: number; checks: ReadinessCheck[] };

/** A8. */
export type Welcome = {
  profile: OrgProfile;
  goals: OrgGoal[];
  owners: { topic: string; owner_user_id: string }[];
  glossary: GlossaryTerm[];
  team: { user_id: string }[];
};

/** B1 `meeting_templates`. */
export type TemplateAgendaItem = { title: string; duration_minutes: number | null };
export type MeetingTemplate = {
  id: string;
  name: string;
  description: string;
  default_duration_minutes: number;
  agenda: TemplateAgendaItem[];
  confidential: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};
export type MeetingTemplateInput = {
  name: string;
  description: string;
  default_duration_minutes: number;
  agenda: TemplateAgendaItem[];
  confidential: boolean;
};

/* ---------------- limits (ADR-0039 A1 to A7, B1) ---------------- */

export const BRAIN_LIMITS = {
  profile: {
    description: 2000,
    /** the readiness check counts a description of at least this many characters */
    descriptionReady: 40,
    industry: 100,
    products: { max: 30, itemMax: 80 },
    customers: { max: 50, itemMax: 80 },
  },
  glossary: {
    term: 80,
    definition: 300,
    aliases: { max: 10, itemMax: 80 },
    maxTerms: 500,
    importMax: 200,
    ready: 10,
  },
  owners: { topic: 80, max: 200, ready: 5 },
  goals: { title: 200, description: 1000, period: 20, maxActive: 30 },
  groundRules: { max: 30, itemMax: 80 },
  templates: {
    name: 80,
    description: 300,
    durationMin: 5,
    durationMax: 480,
    agendaMax: 20,
    /** agenda item limits are the meeting agenda's own (ADR-0038 D6) */
    itemTitle: 200,
    itemMinutesMin: 1,
    itemMinutesMax: 240,
    max: 50,
  },
} as const;

/* ---------------- small text helpers ---------------- */

/** Collapse runs of whitespace and trim. */
export function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Trimmed, empties dropped, duplicates (ignoring case) dropped, first spelling kept. */
export function cleanTopics(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const item = squash(raw);
    if (!item) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function same(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isKind(v: unknown): v is GlossaryKind {
  return typeof v === "string" && (GLOSSARY_KINDS as readonly string[]).includes(v);
}

export function isGoalStatus(v: unknown): v is GoalStatus {
  return typeof v === "string" && (GOAL_STATUSES as readonly string[]).includes(v);
}

export { isKind as isGlossaryKind };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

/* ---------------- normalizers (tolerant of a server mid-rollout) ---------------- */

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** A list body as either a bare array or `{items: [...]}`. */
export function asItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const items = obj(raw).items;
  return Array.isArray(items) ? items : [];
}

export const EMPTY_PROFILE: OrgProfile = {
  description: "",
  industry: "",
  products: [],
  customers: [],
  updated_by: null,
  updated_at: null,
};

export function normalizeOrgProfile(raw: unknown): OrgProfile {
  const r = obj(raw);
  return {
    description: str(r.description),
    industry: str(r.industry),
    products: strList(r.products),
    customers: strList(r.customers),
    updated_by: strOrNull(r.updated_by),
    updated_at: strOrNull(r.updated_at),
  };
}

export function normalizeTerm(raw: unknown): GlossaryTerm | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || typeof r.term !== "string") return null;
  return {
    id: r.id,
    term: r.term,
    kind: isKind(r.kind) ? r.kind : "other",
    definition: strOrNull(r.definition),
    aliases: strList(r.aliases),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function normalizeOwner(raw: unknown): TopicOwner | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || typeof r.topic !== "string" || typeof r.owner_user_id !== "string") return null;
  return { id: r.id, topic: r.topic, owner_user_id: r.owner_user_id, created_at: str(r.created_at) };
}

export function normalizeGoal(raw: unknown): OrgGoal | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || typeof r.title !== "string") return null;
  return {
    id: r.id,
    title: r.title,
    description: strOrNull(r.description),
    period: strOrNull(r.period),
    status: isGoalStatus(r.status) ? r.status : "active",
    owner_user_id: strOrNull(r.owner_user_id),
    position: typeof r.position === "number" && Number.isFinite(r.position) ? r.position : 0,
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function normalizeTemplate(raw: unknown): MeetingTemplate | null {
  const r = obj(raw);
  if (typeof r.id !== "string" || typeof r.name !== "string") return null;
  const agenda = Array.isArray(r.agenda)
    ? r.agenda
        .map((a) => {
          const it = obj(a);
          const minutes = typeof it.duration_minutes === "number" ? it.duration_minutes : null;
          return typeof it.title === "string" ? { title: it.title, duration_minutes: minutes } : null;
        })
        .filter((a): a is TemplateAgendaItem => a !== null)
    : [];
  return {
    id: r.id,
    name: r.name,
    description: str(r.description),
    default_duration_minutes: typeof r.default_duration_minutes === "number" ? r.default_duration_minutes : 30,
    agenda,
    confidential: r.confidential === true,
    created_by: strOrNull(r.created_by),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

export function normalizeGroundRules(raw: unknown): GroundRules {
  return { never_record_topics: strList(obj(raw).never_record_topics) };
}

export function normalizeList<T>(raw: unknown, one: (r: unknown) => T | null): T[] {
  return asItems(raw)
    .map(one)
    .filter((x): x is T => x !== null);
}

export function normalizeWelcome(raw: unknown): Welcome {
  const r = obj(raw);
  return {
    profile: normalizeOrgProfile(r.profile),
    goals: sortGoals(normalizeList(r.goals, normalizeGoal)),
    owners: asItems(r.owners)
      .map((o) => obj(o))
      .filter((o) => typeof o.topic === "string" && typeof o.owner_user_id === "string")
      .map((o) => ({ topic: o.topic as string, owner_user_id: o.owner_user_id as string })),
    glossary: sortTerms(normalizeList(r.glossary, normalizeTerm)),
    team: asItems(r.team)
      .map((t) => obj(t))
      .filter((t) => typeof t.user_id === "string")
      .map((t) => ({ user_id: t.user_id as string })),
  };
}

/* ---------------- sorting and filtering ---------------- */

export function sortTerms(terms: readonly GlossaryTerm[]): GlossaryTerm[] {
  return [...terms].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: "base" }));
}

/** Goals in the admin's order: by `position`, then oldest first. */
export function sortGoals(goals: readonly OrgGoal[]): OrgGoal[] {
  return [...goals].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

/** Terms matching a search (term, aliases or definition) and a kind filter (`null` for all). */
export function filterTerms(terms: readonly GlossaryTerm[], query: string, kind: GlossaryKind | null): GlossaryTerm[] {
  const q = squash(query).toLowerCase();
  return terms.filter((t) => {
    if (kind && t.kind !== kind) return false;
    if (!q) return true;
    return (
      t.term.toLowerCase().includes(q) ||
      t.aliases.some((a) => a.toLowerCase().includes(q)) ||
      (t.definition ?? "").toLowerCase().includes(q)
    );
  });
}

export function kindCounts(terms: readonly GlossaryTerm[]): Record<GlossaryKind, number> {
  const counts = Object.fromEntries(GLOSSARY_KINDS.map((k) => [k, 0])) as Record<GlossaryKind, number>;
  for (const t of terms) counts[t.kind] += 1;
  return counts;
}

/** Move one item and return a new array. Out-of-range moves return a copy unchanged. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const out = [...items];
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [it] = out.splice(from, 1);
  out.splice(to, 0, it);
  return out;
}

/** The `position` writes a reorder needs: every goal whose index no longer equals its position. */
export function reorderPatches(ordered: readonly Pick<OrgGoal, "id" | "position">[]): { id: string; position: number }[] {
  return ordered.flatMap((g, i) => (g.position === i ? [] : [{ id: g.id, position: i }]));
}

/* ---------------- validation ---------------- */

export type FieldErrors<F extends string> = Partial<Record<F, string>>;
export type Checked<F extends string, V> = { ok: true; value: V } | { ok: false; errors: FieldErrors<F> };

function checkList(items: string[], limit: { max: number; itemMax: number }, noun: { one: string; many: string }): string | undefined {
  const long = items.find((i) => i.length > limit.itemMax);
  if (long) return `Keep each ${noun.one} under ${limit.itemMax} characters. "${long.slice(0, 24)}..." is too long.`;
  if (items.length > limit.max) return `Keep it to ${limit.max} ${noun.many} or fewer.`;
  return undefined;
}

export type ProfileField = "description" | "industry" | "products" | "customers";

export function validateOrgProfile(input: {
  description: string;
  industry: string;
  products: readonly string[];
  customers: readonly string[];
}): Checked<ProfileField, OrgProfileUpdate> {
  const L = BRAIN_LIMITS.profile;
  const description = input.description.trim();
  const industry = squash(input.industry);
  const products = cleanTopics(input.products);
  const customers = cleanTopics(input.customers);
  const errors: FieldErrors<ProfileField> = {};
  if (description.length > L.description)
    errors.description = `Keep this under ${L.description} characters (${description.length} now).`;
  if (industry.length > L.industry) errors.industry = `Keep the industry under ${L.industry} characters.`;
  const p = checkList(products, L.products, { one: "product", many: "products" });
  if (p) errors.products = p;
  const c = checkList(customers, L.customers, { one: "customer", many: "customers" });
  if (c) errors.customers = c;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { description, industry, products, customers } };
}

export type TermField = "term" | "kind" | "definition" | "aliases";

/**
 * Check one vocabulary term. `existing` catches a duplicate before the server's unique index does
 * (it compares terms ignoring case, like `lower(term)`); `selfId` is the term being edited.
 */
export function validateTerm(
  input: { term: string; kind: string; definition: string; aliases: readonly string[] },
  existing: readonly Pick<GlossaryTerm, "id" | "term">[] = [],
  selfId?: string,
): Checked<TermField, GlossaryTermInput> {
  const L = BRAIN_LIMITS.glossary;
  const term = squash(input.term);
  const definition = input.definition.trim();
  const aliases = cleanTopics(input.aliases).filter((a) => !same(a, term));
  const errors: FieldErrors<TermField> = {};
  if (!term) errors.term = "Add the term.";
  else if (term.length > L.term) errors.term = `Keep the term under ${L.term} characters.`;
  else if (existing.some((t) => t.id !== selfId && same(t.term, term))) errors.term = `"${term}" is already in the vocabulary.`;
  if (!isKind(input.kind)) errors.kind = "Pick what kind of term this is.";
  if (definition.length > L.definition) errors.definition = `Keep the definition under ${L.definition} characters (${definition.length} now).`;
  const a = checkList(aliases, L.aliases, { one: "other spelling", many: "other spellings" });
  if (a) errors.aliases = a;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { term, kind: input.kind as GlossaryKind, definition: definition || null, aliases } };
}

export type OwnerField = "topic" | "owner_user_id";

export function validateOwner(
  input: { topic: string; owner_user_id: string },
  existing: readonly Pick<TopicOwner, "id" | "topic">[] = [],
  selfId?: string,
): Checked<OwnerField, TopicOwnerInput> {
  const L = BRAIN_LIMITS.owners;
  const topic = squash(input.topic);
  const errors: FieldErrors<OwnerField> = {};
  if (!topic) errors.topic = "Name the topic.";
  else if (topic.length > L.topic) errors.topic = `Keep the topic under ${L.topic} characters.`;
  else if (existing.some((o) => o.id !== selfId && same(o.topic, topic))) errors.topic = `"${topic}" already has an owner.`;
  if (!input.owner_user_id) errors.owner_user_id = "Pick who owns it.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { topic, owner_user_id: input.owner_user_id } };
}

export type GoalField = "title" | "description" | "period" | "status" | "owner_user_id";

/**
 * Check one goal. `activeOthers` is how many other goals are active, for the cap of 30.
 */
export function validateGoal(
  input: { title: string; description: string; period: string; status: string; owner_user_id: string | null },
  activeOthers = 0,
): Checked<GoalField, OrgGoalInput> {
  const L = BRAIN_LIMITS.goals;
  const title = squash(input.title);
  const description = input.description.trim();
  const period = squash(input.period);
  const errors: FieldErrors<GoalField> = {};
  if (!title) errors.title = "Say what the goal is.";
  else if (title.length > L.title) errors.title = `Keep the goal under ${L.title} characters.`;
  if (description.length > L.description) errors.description = `Keep the detail under ${L.description} characters.`;
  if (period.length > L.period) errors.period = `Keep the period under ${L.period} characters, like 2026-Q4.`;
  if (!isGoalStatus(input.status)) errors.status = "Pick a status.";
  else if (input.status === "active" && activeOthers >= L.maxActive)
    errors.status = `There are already ${L.maxActive} active goals. Mark one achieved or dropped first.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      title,
      description: description || null,
      period: period || null,
      status: input.status as GoalStatus,
      owner_user_id: input.owner_user_id || null,
    },
  };
}

export function validateGroundRules(topics: readonly string[]): Checked<"never_record_topics", GroundRules> {
  const clean = cleanTopics(topics);
  const e = checkList(clean, BRAIN_LIMITS.groundRules, { one: "topic", many: "topics" });
  if (e) return { ok: false, errors: { never_record_topics: e } };
  return { ok: true, value: { never_record_topics: clean } };
}

export type TemplateField = "name" | "description" | "default_duration_minutes" | "agenda";

export function validateTemplate(
  input: {
    name: string;
    description: string;
    default_duration_minutes: number | string;
    agenda: readonly { title: string; duration_minutes: number | string | null }[];
    confidential: boolean;
  },
  existing: readonly Pick<MeetingTemplate, "id" | "name">[] = [],
  selfId?: string,
): Checked<TemplateField, MeetingTemplateInput> {
  const L = BRAIN_LIMITS.templates;
  const name = squash(input.name);
  const description = input.description.trim();
  const minutes = Number(input.default_duration_minutes);
  const errors: FieldErrors<TemplateField> = {};
  if (!name) errors.name = "Name the meeting type.";
  else if (name.length > L.name) errors.name = `Keep the name under ${L.name} characters.`;
  else if (existing.some((t) => t.id !== selfId && same(t.name, name))) errors.name = `There is already a "${name}".`;
  if (description.length > L.description) errors.description = `Keep the description under ${L.description} characters.`;
  if (!Number.isInteger(minutes) || minutes < L.durationMin || minutes > L.durationMax)
    errors.default_duration_minutes = `Pick a length from ${L.durationMin} to ${L.durationMax} minutes.`;

  const agenda: TemplateAgendaItem[] = [];
  for (let i = 0; i < input.agenda.length; i++) {
    const raw = input.agenda[i];
    const title = squash(raw.title);
    const m = raw.duration_minutes === null || raw.duration_minutes === "" ? null : Number(raw.duration_minutes);
    if (!title) {
      // A row left completely empty is dropped, not an error.
      if (m === null) continue;
      errors.agenda = `Agenda item ${i + 1} needs a title.`;
      break;
    }
    if (title.length > L.itemTitle) {
      errors.agenda = `Agenda item ${i + 1} is too long. Keep it under ${L.itemTitle} characters.`;
      break;
    }
    if (m !== null && (!Number.isInteger(m) || m < L.itemMinutesMin || m > L.itemMinutesMax)) {
      errors.agenda = `Agenda item ${i + 1}: minutes go from ${L.itemMinutesMin} to ${L.itemMinutesMax}.`;
      break;
    }
    agenda.push({ title, duration_minutes: m });
  }
  if (!errors.agenda && agenda.length > L.agendaMax) errors.agenda = `Keep the agenda to ${L.agendaMax} items or fewer.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, description, default_duration_minutes: minutes, agenda, confidential: input.confidential },
  };
}

/** Total of the agenda's minutes (items without minutes count as 0). */
export function agendaMinutes(agenda: readonly TemplateAgendaItem[]): number {
  return agenda.reduce((sum, a) => sum + (a.duration_minutes ?? 0), 0);
}

/**
 * Which field a 422 `detail` names, if any, so the error lands next to it. Matches a field name
 * as a whole word (`definition`, `aliases`, `owner_user_id`).
 */
export function fieldFromDetail<F extends string>(detail: string, fields: readonly F[]): F | null {
  const text = detail.toLowerCase();
  for (const f of fields) {
    if (new RegExp(`(^|[^a-z_])${f}([^a-z_]|$)`).test(text)) return f;
  }
  return null;
}

/* ---------------- paste a list ---------------- */

export type ImportRow = GlossaryTermInput & { line: number };
export type ImportProblem = { line: number; text: string; reason: string };
export type ImportParse = {
  rows: ImportRow[];
  problems: ImportProblem[];
  /** lines naming a term already earlier in the paste (the first one is kept) */
  repeated: number;
  /** valid lines past the import limit, left out */
  overLimit: number;
};

const BULLET = /^(?:[-*•·]|\d{1,3}[.)])\s+/;
/** term / definition separators, the earliest one on the line wins */
const SEPARATORS = [/\t/, /:/, /\s[-\u2013\u2014]\s/];

/** Short all-capitals words (ARR, SOC2, P&L) read as acronyms. */
export function looksLikeAcronym(term: string): boolean {
  return /^[A-Z][A-Z0-9&]{1,9}$/.test(term) && /[A-Z].*[A-Z]|[A-Z]&/.test(term);
}

function splitAliases(text: string): string[] {
  return text.split(/[,;/]/).map(squash).filter(Boolean);
}

/**
 * Parse a pasted list, one term per line. Understood:
 *
 * - `term`, `term: definition`, and the same with a tab or a spaced dash as the separator;
 * - list bullets and numbering at the start of a line are ignored;
 * - `Term (other, spellings): definition` puts the bracketed words in `aliases`; with no
 *   definition, `ARR (annual recurring revenue)` reads the brackets as the definition.
 *
 * Kind is `defaultKind`, except that short all-capitals terms become `acronym` when
 * `detectAcronyms` is on. A term repeated in the paste keeps its first line. Lines that break a
 * limit are returned as problems with the reason, never silently trimmed.
 */
export function parseGlossaryImport(
  text: string,
  opts: { defaultKind?: GlossaryKind; detectAcronyms?: boolean; max?: number } = {},
): ImportParse {
  const { defaultKind = "other", detectAcronyms = true, max = BRAIN_LIMITS.glossary.importMax } = opts;
  const L = BRAIN_LIMITS.glossary;
  const rows: ImportRow[] = [];
  const problems: ImportProblem[] = [];
  const seen = new Set<string>();
  let repeated = 0;
  let overLimit = 0;

  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = i + 1;
    const content = rawLine.trim().replace(BULLET, "").trim();
    if (!content) return;

    let cut = -1;
    let sepLength = 0;
    for (const sep of SEPARATORS) {
      const m = sep.exec(content);
      if (m && (cut === -1 || m.index < cut)) {
        cut = m.index;
        sepLength = m[0].length;
      }
    }
    let head = squash(cut === -1 ? content : content.slice(0, cut));
    let definition = cut === -1 ? "" : content.slice(cut + sepLength).trim();
    let aliases: string[] = [];

    const paren = /^(.*?)\s*\(([^()]*)\)$/.exec(head);
    if (paren && squash(paren[1])) {
      head = squash(paren[1]);
      const inside = squash(paren[2]);
      if (definition) aliases = splitAliases(inside);
      else definition = inside;
    }

    if (!head) {
      problems.push({ line, text: rawLine.trim(), reason: "There is no term before the separator." });
      return;
    }
    if (head.length > L.term) {
      problems.push({ line, text: rawLine.trim(), reason: `The term is longer than ${L.term} characters.` });
      return;
    }
    if (definition.length > L.definition) {
      problems.push({ line, text: rawLine.trim(), reason: `The definition is longer than ${L.definition} characters.` });
      return;
    }
    aliases = cleanTopics(aliases).filter((a) => !same(a, head));
    if (aliases.length > L.aliases.max || aliases.some((a) => a.length > L.aliases.itemMax)) {
      problems.push({ line, text: rawLine.trim(), reason: `Up to ${L.aliases.max} other spellings, each under ${L.aliases.itemMax} characters.` });
      return;
    }

    const key = head.toLowerCase();
    if (seen.has(key)) {
      repeated += 1;
      return;
    }
    seen.add(key);
    if (rows.length >= max) {
      overLimit += 1;
      return;
    }
    rows.push({
      line,
      term: head,
      kind: detectAcronyms && looksLikeAcronym(head) ? "acronym" : defaultKind,
      definition: definition || null,
      aliases,
    });
  });

  return { rows, problems, repeated, overLimit };
}

/** Split parsed rows into new terms and ones that will update an existing term (upsert by term). */
export function splitNewAndExisting<R extends { term: string }>(
  rows: readonly R[],
  existing: readonly Pick<GlossaryTerm, "term">[],
): { added: R[]; updated: R[] } {
  const have = new Set(existing.map((t) => t.term.toLowerCase()));
  const added: R[] = [];
  const updated: R[] = [];
  for (const r of rows) (have.has(r.term.toLowerCase()) ? updated : added).push(r);
  return { added, updated };
}

/* ---------------- readiness (A7) ---------------- */

/** Where each check is fixed, and the words on the link. */
export const READINESS_FIX: Record<ReadinessKey, { href: string; action: string; label: string }> = {
  profile: { href: "/tenant/brain/about", action: "Describe the company", label: "About the company" },
  vocabulary: { href: "/tenant/brain/vocabulary", action: "Add terms", label: "Vocabulary" },
  owners: { href: "/tenant/brain/owners", action: "Name owners", label: "Who owns what" },
  goals: { href: "/tenant/brain/goals", action: "Add a goal", label: "Goals" },
  ground_rules: { href: "/tenant/brain/ground-rules", action: "Set ground rules", label: "Ground rules" },
  roles: { href: "/tenant/members", action: "See members", label: "Everyone has a role" },
};

export function isReadinessKey(k: unknown): k is ReadinessKey {
  return typeof k === "string" && (READINESS_KEYS as readonly string[]).includes(k);
}

/** The server's readiness, its checks in the ADR's order, the score clamped to 0..100. */
export function normalizeReadiness(raw: unknown): Readiness {
  const r = obj(raw);
  const checks: ReadinessCheck[] = asItems(r.checks)
    .map((c) => obj(c))
    .filter((c) => typeof c.key === "string")
    .map((c) => ({
      key: c.key as string,
      label: typeof c.label === "string" && c.label ? c.label : isReadinessKey(c.key) ? READINESS_FIX[c.key].label : (c.key as string),
      done: c.done === true,
      detail: str(c.detail),
    }));
  const rank = (k: string) => {
    const i = (READINESS_KEYS as readonly string[]).indexOf(k);
    return i === -1 ? READINESS_KEYS.length : i;
  };
  checks.sort((a, b) => rank(a.key) - rank(b.key));
  const score = typeof r.score === "number" && Number.isFinite(r.score) ? Math.round(Math.min(100, Math.max(0, r.score))) : 0;
  return { score, checks };
}

export type ReadinessFacts = {
  descriptionLength: number;
  terms: number;
  owners: number;
  activeGoals: number;
  groundRulesSet: boolean;
  /** members with no role; null when not known here */
  membersWithoutRole: number | null;
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The readiness rules of A7, computed from what the screen already holds. Used while the server's
 * own figure is unavailable (the first-run setup reads it from the server when it can). Equal
 * weights; a check that cannot be known here counts as not done.
 */
export function deriveReadiness(f: ReadinessFacts): Readiness {
  const L = BRAIN_LIMITS;
  const checks: ReadinessCheck[] = [
    {
      key: "profile",
      label: "Describe the company",
      done: f.descriptionLength >= L.profile.descriptionReady,
      detail:
        f.descriptionLength >= L.profile.descriptionReady
          ? "Agents know what the company does."
          : `A description of at least ${L.profile.descriptionReady} characters.`,
    },
    {
      key: "vocabulary",
      label: "Teach the vocabulary",
      done: f.terms >= L.glossary.ready,
      detail: `${plural(f.terms, "term")} of ${L.glossary.ready}.`,
    },
    {
      key: "owners",
      label: "Say who owns what",
      done: f.owners >= L.owners.ready,
      detail: `${plural(f.owners, "topic")} with an owner of ${L.owners.ready}.`,
    },
    {
      key: "goals",
      label: "Set a goal",
      done: f.activeGoals >= 1,
      detail: f.activeGoals ? `${plural(f.activeGoals, "active goal")}.` : "No active goal yet.",
    },
    {
      key: "ground_rules",
      label: "Set the ground rules",
      done: f.groundRulesSet,
      detail: f.groundRulesSet ? "Set." : "Not set yet.",
    },
    {
      key: "roles",
      label: "Everyone has a role",
      done: f.membersWithoutRole === 0,
      detail:
        f.membersWithoutRole === null
          ? "Not checked yet."
          : f.membersWithoutRole === 0
            ? "Every member told their agent their role."
            : `${plural(f.membersWithoutRole, "member")} without a role.`,
    },
  ];
  const done = checks.filter((c) => c.done).length;
  return { score: Math.round((done / checks.length) * 100), checks };
}

/** Where a check is fixed; unknown keys go to the brain's overview. */
export function fixFor(key: string): { href: string; action: string } {
  return isReadinessKey(key) ? READINESS_FIX[key] : { href: "/tenant/brain", action: "Open" };
}

/* ---------------- first run and the welcome window ---------------- */

/** True when the org has written nothing about itself yet: the first-run setup's trigger. */
export function isOrgProfileEmpty(p: OrgProfile | null): boolean {
  if (!p) return true;
  return !p.description.trim() && !p.industry.trim() && p.products.length === 0 && p.customers.length === 0;
}

export const WELCOME_DAYS = 14;

/**
 * Days left of the new-joiner window (ADR-0039 Part E: the brief is offered for 14 days after
 * joining), counted from the member's `users.created_at`. Null when the date is unknown or the
 * window has passed.
 */
export function welcomeDaysLeft(joinedAt: string | null | undefined, now: Date, days = WELCOME_DAYS): number | null {
  if (!joinedAt) return null;
  const t = Date.parse(joinedAt);
  if (Number.isNaN(t)) return null;
  const elapsed = now.getTime() - t;
  if (elapsed < 0) return days;
  const left = days - Math.floor(elapsed / 86_400_000);
  return left > 0 ? left : null;
}

/** "2026-Q4" for a date, the period a new goal is suggested for. */
export function currentQuarter(now: Date): string {
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`;
}

/** Whole minutes to read some text at about 230 words a minute, at least 1. */
export function readingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}
