/**
 * Where the routes that moved in the November 2026 information architecture now live. Every old
 * route keeps working: its page calls `redirect(legacyHref(...))`, so bookmarks, emails and the
 * links notification-service stored before the move (`/status-requests`, `/tenant/brain/...`) land
 * on the new home with their query string intact. Pure, so the table is tested.
 *
 *   /tasks                 -> /work/tasks
 *   /promises              -> /work/promises
 *   /status-requests       -> /work/updates
 *   /notifications         -> /inbox?filter=notifications
 *   /org                   -> /people
 *   /tenant                -> /workspace
 *   /tenant/members        -> /workspace/members
 *   /tenant/brain[/...]    -> /workspace/brain[/...]
 *   /tenant/usage          -> /workspace/billing
 *   /tenant/agents         -> /workspace/agents
 *   /tenant/data           -> /workspace/data
 *   /tenant/settings       -> /workspace/data
 *   /tenant/support        -> /workspace/support
 *   /billing               -> /workspace/billing (admins; members see a plain note instead)
 *   /settings              -> /settings/profile
 *   /settings/agent        -> /agent
 */

const FIXED: Record<string, string> = {
  "/tasks": "/work/tasks",
  "/promises": "/work/promises",
  "/status-requests": "/work/updates",
  "/notifications": "/inbox?filter=notifications",
  "/org": "/people",
  "/tenant": "/workspace",
  "/tenant/members": "/workspace/members",
  "/tenant/usage": "/workspace/billing",
  "/tenant/agents": "/workspace/agents",
  "/tenant/data": "/workspace/data",
  "/tenant/settings": "/workspace/data",
  "/tenant/support": "/workspace/support",
  "/billing": "/workspace/billing",
  "/settings": "/settings/profile",
  "/settings/agent": "/agent",
  "/work": "/work/tasks",
};

export type SearchParams = Record<string, string | string[] | undefined>;

function query(params: SearchParams | undefined): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(params ?? {})) {
    for (const one of Array.isArray(v) ? v : v === undefined ? [] : [v]) out.push(`${encodeURIComponent(k)}=${encodeURIComponent(one)}`);
  }
  return out;
}

/** The new home of an old path, with the old query string carried over; null for a path that did
    not move. */
export function legacyHref(path: string, params?: SearchParams): string | null {
  const clean = path.replace(/\/+$/, "") || "/";
  let target = FIXED[clean] ?? null;
  if (!target && (clean === "/tenant/brain" || clean.startsWith("/tenant/brain/"))) target = clean.replace(/^\/tenant/, "/workspace");
  if (!target) return null;
  const [base, own] = target.split("?");
  const parts = [...(own ? own.split("&") : []), ...query(params)];
  return parts.length ? `${base}?${parts.join("&")}` : base;
}
