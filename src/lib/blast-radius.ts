/**
 * Blast radius (a4 contract, section 3b), as pure helpers: the wire normalizers, the request
 * table, the words for each effect, the ripple map's geometry and its keyboard moves. Tested under
 * `node --test` (tests/blast-radius.test.ts).
 */

import type {
  BlastCounts,
  BlastRadius,
  MeetingBlastItem,
  Person,
  RingNumber,
  RippleEffect,
  RippleItem,
  RippleKind,
  SourceState,
} from "./api/why-blast-types";

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : null);
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const count = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

function person(v: unknown): Person | null {
  const o = obj(v);
  return o && typeof o.user_id === "string" ? { user_id: o.user_id, name: str(o.name).trim() || "Someone" } : null;
}

const KINDS: readonly RippleKind[] = ["action", "goal", "decision", "customer_action", "deal"];
const EFFECTS: readonly RippleEffect[] = ["changes", "blocks", "unblocks", "advances", "risks", "contradicts", "commits"];

export const RING_LABEL: Record<RingNumber, string> = {
  1: "Work it changes",
  2: "Goals and other teams",
  3: "Customers",
};

/** Only same-site paths are followed from the map; anything else is dropped. */
export function safeHref(v: unknown): string | null {
  const s = strOrNull(v);
  if (!s) return null;
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
}

export function normalizeItem(v: unknown, ring: RingNumber): RippleItem | null {
  const o = obj(v);
  if (!o || typeof o.id !== "string") return null;
  const redacted = o.redacted === true;
  return {
    id: o.id,
    kind: KINDS.includes(o.kind as RippleKind) ? (o.kind as RippleKind) : "action",
    ring,
    label: redacted ? null : strOrNull(o.label),
    effect: EFFECTS.includes(o.effect as RippleEffect) ? (o.effect as RippleEffect) : "changes",
    why: redacted ? null : strOrNull(o.why),
    href: redacted ? null : safeHref(o.href),
    redacted,
    owner: redacted ? null : person(o.owner),
    team: strOrNull(o.team),
    status: strOrNull(o.status),
    due: strOrNull(o.due),
    settlement_id: strOrNull(o.settlement_id),
  };
}

function counts(v: unknown): BlastCounts {
  const o = obj(v) ?? {};
  return { actions: count(o.actions), goals: count(o.goals), decisions: count(o.decisions), customers: count(o.customers) };
}

const RINGS: readonly RingNumber[] = [1, 2, 3];
const SOURCE_STATES: readonly SourceState[] = ["connected", "not_connected", "unknown"];

export function normalizeBlast(v: unknown): BlastRadius | null {
  const o = obj(v);
  if (!o || typeof o.decision_id !== "string") return null;
  const wire = Array.isArray(o.rings) ? o.rings.map(obj).filter((r): r is Obj => r !== null) : [];
  // Always three rings in order, whatever the server left out.
  const rings = RINGS.map((ring) => {
    const r = wire.find((w) => w.ring === ring);
    const items = Array.isArray(r?.items) ? r.items.map((i) => normalizeItem(i, ring)).filter((i): i is RippleItem => i !== null) : [];
    return { ring, label: strOrNull(r?.label) ?? RING_LABEL[ring], items };
  });
  const crm = obj(o.crm) ?? {};
  return {
    decision_id: o.decision_id,
    meeting_id: str(o.meeting_id),
    content: str(o.content),
    state: o.state === "pending" ? "pending" : "ready",
    summary: str(o.summary).trim(),
    counts: counts(o.counts),
    rings,
    crm: { hubspot: SOURCE_STATES.includes(crm.hubspot as SourceState) ? (crm.hubspot as SourceState) : "unknown" },
  };
}

export function normalizeMeetingBlast(v: unknown): MeetingBlastItem[] | null {
  const o = obj(v);
  if (!o || !Array.isArray(o.items)) return null;
  return o.items
    .map(obj)
    .filter((i): i is Obj => i !== null && typeof i.decision_id === "string")
    .map((i) => ({
      decision_id: str(i.decision_id),
      content: str(i.content),
      state: i.state === "pending" ? "pending" : "ready",
      summary: str(i.summary).trim(),
      counts: counts(i.counts),
    }));
}

const seg = (id: string) => encodeURIComponent(id);
export const blastRoutes = {
  decision: (decisionId: string) => `/api/v1/decisions/${seg(decisionId)}/blast-radius`,
  meeting: (meetingId: string) => `/api/v1/meetings/${seg(meetingId)}/blast-radius`,
};

/* ---------------- words ---------------- */

/** Frozen priority language: what risks, contradicts or blocks needs attention (amber); what
 *  advances or unblocks is good news (green); a plain change only informs. */
export type EffectTone = "attention" | "ok" | "info";

export const EFFECT: Record<RippleEffect, { label: string; tone: EffectTone }> = {
  changes: { label: "Changes", tone: "info" },
  blocks: { label: "Blocks", tone: "attention" },
  unblocks: { label: "Unblocks", tone: "ok" },
  advances: { label: "Advances", tone: "ok" },
  risks: { label: "Puts at risk", tone: "attention" },
  contradicts: { label: "May clash", tone: "attention" },
  commits: { label: "Commits", tone: "info" },
};

export const KIND_NOUN: Record<RippleKind, string> = {
  action: "task",
  goal: "goal",
  decision: "decision",
  customer_action: "customer task",
  deal: "deal",
};

/** "Puts this goal at risk", "May clash with this decision": the effect read with its target. */
export function effectPhrase(item: Pick<RippleItem, "effect" | "kind">): string {
  const noun = KIND_NOUN[item.kind];
  switch (item.effect) {
    case "changes":
      return `Changes this ${noun}`;
    case "blocks":
      return `Blocks this ${noun}`;
    case "unblocks":
      return `Unblocks this ${noun}`;
    case "advances":
      return `Moves this ${noun} forward`;
    case "risks":
      return `Puts this ${noun} at risk`;
    case "contradicts":
      return `May clash with this ${noun}`;
    case "commits":
      return item.kind === "deal" ? "Commits to this deal" : `Commits to this ${noun}`;
  }
}

/** The node's text. Another team's decision from a meeting the viewer was not in is never named. */
export function itemLabel(item: Pick<RippleItem, "label" | "redacted" | "team" | "kind">): string {
  if (item.redacted || !item.label) return `A decision from ${item.team ?? "another team"} you were not in`;
  return item.label;
}

/** The one line on a decision card in the room and on the after page. */
export function chipLine(item: Pick<MeetingBlastItem, "state" | "summary" | "counts">): { text: string; quiet: boolean; pending: boolean } {
  if (item.state === "pending") return { text: "Working out what this decision touches", quiet: true, pending: true };
  const c = item.counts;
  const total = c.actions + c.goals + c.decisions + c.customers;
  if (total === 0) return { text: "No ripple found", quiet: true, pending: false };
  return { text: item.summary || fallbackSummary(c), quiet: false, pending: false };
}

const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

/** Used only when the server sent counts without its summary line. */
export function fallbackSummary(c: BlastCounts): string {
  const parts = [
    c.actions ? `changes ${n(c.actions, "task", "tasks")}` : null,
    c.goals ? `moves ${n(c.goals, "goal", "goals")}` : null,
    c.decisions ? `clashes with ${n(c.decisions, "decision", "decisions")}` : null,
    c.customers ? `reaches ${n(c.customers, "customer item", "customer items")}` : null,
  ].filter((p): p is string => p !== null);
  if (!parts.length) return "No ripple found";
  const line = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** What the empty state says was checked. */
export function checkedLine(hubspot: SourceState): string {
  const base = "We looked at open tasks across your workspace, your company goals, other teams' decisions and work promised to customers";
  return hubspot === "connected" ? `${base}, and HubSpot deals.` : `${base}.`;
}

export const CHIP_POLL = { everyMs: 5000, forMs: 60_000 } as const;
export const BLAST_POLL = { everyMs: 5000, forMs: 60_000 } as const;

/* ---------------- the ripple map's geometry ---------------- */

/* The decision sits at the left middle; each ring is a circle around it, so on the canvas it reads
   as an arc, and that ring's items stand on the arc, one under the other. Stacking along the arc
   keeps every label horizontal and legible at any count (the canvas grows taller instead of the
   labels colliding), while the rings still read as ripples spreading from the decision. */

export const MAP = {
  row: 48,
  padY: 30,
  head: 34,
  cx: 46,
  minHeight: 240,
  /** container width from which the map is drawn; narrower, the rings stack as lists */
  minWidth: 600,
} as const;

export type MapNode = { ring: RingNumber; index: number; x: number; y: number; maxW: number };
export type MapLayout = {
  width: number;
  height: number;
  cx: number;
  cy: number;
  radii: [number, number, number];
  /** each ring's column width at its middle row (a node's widest pill) */
  columns: [number, number, number];
  nodes: MapNode[];
};

/** How many nodes a ring shows before its "more" node, at this width. */
export function mapCap(width: number): number {
  return width >= 760 ? 7 : 5;
}

/** A pill's natural width for a label: the effect dot, the gaps and the text. */
export function pillWidth(label: string): number {
  return Math.round(46 + label.length * 7.3);
}

/**
 * Lay the map out for `width` px. `slots[k]` is the number of nodes drawn on ring k+1 (the "more"
 * node included); `want[k]` the widest pill ring k+1 would like. Each ring gets a column as wide as
 * its labels need (within 120 to 300 px); what is left goes partly to the breathing room around the
 * decision and partly to the columns, and a crowded width shrinks every column alike.
 */
export function mapLayout(width: number, slots: [number, number, number], want: [number, number, number] = [220, 220, 220]): MapLayout {
  const { row, padY, head, cx, minHeight } = MAP;
  const gap = 28;
  const rows = Math.max(3, ...slots);
  const height = Math.max(minHeight, rows * row + padY * 2) + head;
  const cy = head + (height - head) / 2;
  const usable = Math.max(260, width - cx - 4);
  const span1 = ((Math.max(1, slots[0]) - 1) / 2) * row;

  let r1 = Math.max(72, span1 + 40);
  const asked = want.map((w) => Math.min(300, Math.max(120, w)));
  // A pill starts 18px left of its ring and the last one must end inside the canvas.
  const avail = usable - r1 - 2 * gap + 18;
  const sum = asked[0] + asked[1] + asked[2];
  let cols: number[];
  if (sum > avail) {
    const scale = avail / sum;
    cols = asked.map((w) => Math.max(90, Math.floor(w * scale)));
  } else {
    const extra = avail - sum;
    r1 += Math.min(extra * 0.3, 120);
    const rest = avail - sum - Math.min(extra * 0.3, 120);
    cols = asked.map((w) => w + rest / 3);
  }
  const r2 = r1 + cols[0] + gap;
  const r3 = r2 + cols[1] + gap;
  const radii: [number, number, number] = [r1, r2, r3];

  const xAt = (r: number, y: number) => cx + Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  const nodes: MapNode[] = [];
  ([1, 2, 3] as const).forEach((ring, k) => {
    const n = slots[k];
    for (let i = 0; i < n; i++) {
      const y = cy + (i - (n - 1) / 2) * row;
      const x = xAt(radii[k], y);
      // up to the next ring's pill at this row, or the canvas edge
      const limit = k < 2 ? xAt(radii[k + 1], y) - 18 - 10 : width - 2;
      nodes.push({ ring, index: i, x, y, maxW: Math.max(84, Math.min(320, limit - (x - 18))) });
    }
  });
  return { width, height, cx, cy, radii, columns: [cols[0], cols[1], cols[2]], nodes };
}

/* ---------------- keyboard ---------------- */

export type Focus = { ring: RingNumber; index: number };

/**
 * Where an arrow key moves focus on the map. Up and Down move along a ring (wrapping), Home and
 * End jump to its ends; Left and Right step to the inner or outer ring, to the item nearest the
 * same position. Rings with nothing on them are skipped. Returns null for any other key.
 */
export function moveFocus(key: string, at: Focus, sizes: Record<RingNumber, number>): Focus | null {
  const n = sizes[at.ring];
  if (n <= 0) return null;
  switch (key) {
    case "ArrowDown":
      return { ring: at.ring, index: (at.index + 1) % n };
    case "ArrowUp":
      return { ring: at.ring, index: (at.index - 1 + n) % n };
    case "Home":
      return { ring: at.ring, index: 0 };
    case "End":
      return { ring: at.ring, index: n - 1 };
    case "ArrowRight":
    case "ArrowLeft": {
      const step = key === "ArrowRight" ? 1 : -1;
      for (let r = at.ring + step; r >= 1 && r <= 3; r += step) {
        const m = sizes[r as RingNumber];
        if (m > 0) {
          // keep the relative position: the middle of one ring lands near the middle of the next
          const rel = n > 1 ? at.index / (n - 1) : 0.5;
          return { ring: r as RingNumber, index: Math.min(m - 1, Math.round(rel * (m - 1))) };
        }
      }
      return at;
    }
    default:
      return null;
  }
}
