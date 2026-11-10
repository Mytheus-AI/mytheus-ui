/**
 * Clerk middleware. Plan 1-2 section 3.10 step 3, and the gate the `(app)/layout.tsx`
 * `TODO(auth)` asked for.
 *
 * The list below is an ALLOWLIST of what stays public, not a denylist of what to protect. That
 * direction matters: with a denylist, every new authenticated route is public until somebody
 * remembers to add it, and the failure is silent. Here a new route is protected by default and
 * the mistake is a redirect to sign-in, which is noticed immediately.
 *
 * The client never sends `org_id`. It is derived server-side by `api-gateway` from the verified
 * JWT, so there is nothing tenant-related for this middleware to attach or check.
 */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { hostRedirect, requestHost } from "@/lib/hosts";

/**
 * Host split (marketing on the apex, the app and every auth step on the app host). Both are
 * NEXT_PUBLIC so they are inlined at build time: set them as build args. Unset means no split.
 */
const HOSTS = {
  appHost: process.env.NEXT_PUBLIC_APP_HOST ?? "",
  marketingOrigin: process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? "",
};

/**
 * Public routes. Everything else requires a session.
 *
 * The marketing site is the bulk of it and is genuinely public. `(app)` and `(admin)` are
 * absent from this list on purpose, which is what protects them.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/about(.*)",
  "/blog(.*)",
  "/careers(.*)",
  "/enterprise(.*)",
  "/features(.*)",
  "/pricing(.*)",
  "/security(.*)",
  // `/privacy` and `/terms` are the pages that actually exist. The list previously said
  // `/legal(.*)`, which matches no route in this app, so both were protected and returned 404
  // to a signed-out visitor - the two documents that MUST be publicly reachable, and both
  // linked from the site footer.
  "/privacy(.*)",
  "/terms(.*)",
  // Acquisition page plus its verification step. Gating these means the campaign they exist
  // for cannot convert: a signed-out visitor is exactly the intended audience.
  "/students(.*)",
  // Kept for routes that do not exist yet. Each is a marketing surface that will be public the
  // day it lands, and being here early costs nothing because a matcher for an absent route
  // matches nothing.
  "/contact(.*)",
  "/changelog(.*)",
  "/docs(.*)",
  // The custom auth flows (every step is a sub-path) and the OAuth return page, all of which
  // must be reachable while signed out.
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  // Clerk session tasks. A brand-new account is signed in but "pending" until it picks an
  // organization, and `auth.protect()` treats pending as signed out, so gating this page would
  // bounce the user to sign-in forever. The page itself sends a visitor with no session away.
  "/onboarding(.*)",
  // Mytheus Capture's extension calls these with no Clerk cookie. Each route authenticates
  // itself with the signed link token and the Clerk session behind it, and fails closed
  // (src/app/api/capture/_lib/session.ts).
  "/api/capture/session(.*)",
  // Shared recaps and decision records (minutes for everyone). Opened by people who may not be
  // users at all; the signed token in the path is the credential, checked by core-api's public
  // share route, and the page reads nothing else.
  "/s/(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  // Before auth, so a signed-out visit to an app route on the apex lands on the app host's
  // sign-in rather than a sign-in on the apex whose session the app host would not see.
  const target = hostRedirect(
    requestHost(request.headers),
    request.nextUrl.pathname,
    request.nextUrl.search,
    HOSTS,
  );
  if (target) return NextResponse.redirect(target, 308);
  if (isPublicRoute(request)) return;
  // Redirects to sign-in when there is no session. Fails closed: an unprotected `(app)` route
  // would render the shell and then have every data read rejected by the gateway with a 401,
  // which looks like a broken app rather than a sign-in prompt.
  await auth.protect();
}, {
  // Where `auth.protect()` sends a signed-out visitor. Stated here rather than left to
  // NEXT_PUBLIC_CLERK_SIGN_IN_URL: that variable was only ever in local `.env`, so the
  // production image had none and Clerk fell back to its hosted Account Portal
  // (`*.accounts.dev/sign-in`) instead of our own pages. Relative, so it resolves on the host
  // the request came in on, which after the host split is always the app host.
  signInUrl: "/sign-in",
  signUpUrl: "/sign-up",
});

export const config = {
  matcher: [
    // Everything except Next internals and static assets. Skipping those is a performance
    // matter, not a security one: they carry no tenant data.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
