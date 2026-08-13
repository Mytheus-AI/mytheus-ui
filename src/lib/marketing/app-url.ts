/* Where the product lives.
 *
 * This repo is the marketing site only. The authenticated product - the shell
 * (home, meetings, decisions, tasks, search, settings) and the call surfaces
 * (prejoin, meeting) - is a separate Next.js app in `mytheus-web`, so every
 * "get started" path leaves this origin.
 *
 * One constant, read from the environment, so moving the app (a new subdomain,
 * a preview deploy, a local port) is a config change and never a code change.
 * Its root redirects to `/home`, so linking the bare origin lets that app own
 * its own entry route.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "https://app.mytheus.cloud";

/** Absolute URL for a path inside the product app. `appHref()` is its entry. */
export const appHref = (path = "") =>
  path ? `${APP_URL}/${path.replace(/^\//, "")}` : APP_URL;
