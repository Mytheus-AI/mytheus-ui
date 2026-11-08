/**
 * Which host serves what. The marketing site lives on the apex (mytheus.cloud, www) and the
 * signed-in app, including every auth step, lives on the app host (dashboard.mytheus.cloud).
 * It is one Next.js app behind both hosts, so the split is enforced here with redirects.
 *
 * Pure and dependency-free so `node --test` can exercise it without Next or Clerk.
 *
 * With no app host configured (local dev, CI builds) nothing is redirected and every route is
 * served on whatever host the request came in on.
 */

/** Marketing pages. Public, and served on the marketing host only. "/" is handled apart. */
const MARKETING_PREFIXES = [
  "/about",
  "/blog",
  "/careers",
  "/enterprise",
  "/features",
  "/pricing",
  "/security",
  "/privacy",
  "/terms",
  "/students",
  "/contact",
  "/changelog",
  "/docs",
];

export function isMarketingPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export type HostConfig = {
  /** e.g. "dashboard.mytheus.cloud". Empty disables the split. */
  appHost: string;
  /** e.g. "https://mytheus.cloud". Where marketing pages requested on the app host go. */
  marketingOrigin: string;
};

/** The host a request was made to. Caddy keeps Host, and also sets X-Forwarded-Host. */
export function requestHost(headers: { get(name: string): string | null }): string {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Returns the absolute URL to redirect to, or null to serve the request as is.
 *
 * - App host, "/": the dashboard.
 * - App host, a marketing page: the same page on the marketing origin.
 * - Any other public host, an app or auth route: the same path on the app host.
 * - localhost and 127.0.0.1 are never redirected, so a local production build still works.
 */
export function hostRedirect(
  host: string,
  pathname: string,
  search: string,
  config: HostConfig,
): string | null {
  const appHost = config.appHost.trim().toLowerCase();
  if (!appHost || !host || host === "localhost" || host === "127.0.0.1") return null;

  if (host === appHost) {
    if (pathname === "/") return `https://${appHost}/dashboard${search}`;
    if (isMarketingPath(pathname) && config.marketingOrigin) {
      return `${config.marketingOrigin.replace(/\/$/, "")}${pathname}${search}`;
    }
    return null;
  }

  if (isMarketingPath(pathname)) return null;
  return `https://${appHost}${pathname}${search}`;
}
