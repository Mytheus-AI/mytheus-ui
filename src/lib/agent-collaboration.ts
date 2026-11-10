/**
 * The workspace-level "Agent collaboration" setting (Phase P10, plan 3.5, P10 contract 3 and 8),
 * as pure functions over the grant rows of `identity-tenant-service`'s `agent_authz_scopes`.
 *
 * The admin picks one of four levels; each level is exactly the platform default grant set:
 *   - off:        no grants at all (a fresh tenant; agent-to-agent requests are all denied)
 *   - same_team:  allow, for every role and query class, at self and same_team
 *   - department: the same, up to department
 *   - org:        the same, up to org
 * Anything else (a deny row, a missing tuple, a grant set by hand) reads as "custom".
 *
 * Changing level never widens access by accident: rows wider than the chosen level, and every
 * deny row inside it, are revoked first; then the template for the chosen level is adopted (it
 * inserts missing tuples and re-activates revoked ones as allow, and never touches a live row).
 * Pure so it can be tested without a server.
 */

export type CollaborationLevel = "off" | "same_team" | "department" | "org";
export type CurrentLevel = CollaborationLevel | "custom";

export interface GrantRow {
  id: string;
  grantee_role: string;
  query_class: string;
  target_scope: string;
  effect: string;
}

export const LEVELS: readonly CollaborationLevel[] = ["off", "same_team", "department", "org"];
const SCOPE_ORDER = ["self", "same_team", "department", "org"] as const;
const ROLES = ["owner", "admin", "member"] as const;
const CLASSES = ["meeting_context", "decision_lineage", "action_status"] as const;

export function isLevel(v: unknown): v is CollaborationLevel {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v);
}

/** The scopes a level covers: itself and every narrower one, `self` included. */
function scopesOf(level: Exclude<CollaborationLevel, "off">): readonly string[] {
  return SCOPE_ORDER.slice(0, SCOPE_ORDER.indexOf(level) + 1);
}

const key = (r: Pick<GrantRow, "grantee_role" | "query_class" | "target_scope">) =>
  `${r.grantee_role}|${r.query_class}|${r.target_scope}`;

function templateKeys(level: Exclude<CollaborationLevel, "off">): Set<string> {
  const out = new Set<string>();
  for (const target_scope of scopesOf(level)) {
    for (const grantee_role of ROLES) {
      for (const query_class of CLASSES) out.add(key({ grantee_role, query_class, target_scope }));
    }
  }
  return out;
}

/** Which level the current grants amount to, or "custom" when they match none exactly. */
export function currentLevel(rows: GrantRow[]): CurrentLevel {
  if (rows.length === 0) return "off";
  if (rows.some((r) => r.effect !== "allow")) return "custom";
  const have = new Set(rows.map(key));
  for (const level of ["same_team", "department", "org"] as const) {
    const want = templateKeys(level);
    if (want.size === have.size && Array.from(want).every((k) => have.has(k))) return level;
  }
  return "custom";
}

/** What to call to move from `rows` to `level`: revoke these ids, then adopt this template. */
export function planLevelChange(
  rows: GrantRow[],
  level: CollaborationLevel,
): { revoke: string[]; template: Exclude<CollaborationLevel, "off"> | null } {
  if (level === "off") return { revoke: rows.map((r) => r.id), template: null };
  const allowed = new Set(scopesOf(level));
  const revoke = rows.filter((r) => r.effect !== "allow" || !allowed.has(r.target_scope)).map((r) => r.id);
  return { revoke, template: level };
}
