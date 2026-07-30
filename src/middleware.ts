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
  "/legal(.*)",
  "/contact(.*)",
  "/changelog(.*)",
  "/docs(.*)",
  // Clerk's own hosted flows, which must be reachable while signed out.
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) return;
  // Redirects to sign-in when there is no session. Fails closed: an unprotected `(app)` route
  // would render the shell and then have every data read rejected by the gateway with a 401,
  // which looks like a broken app rather than a sign-in prompt.
  await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals and static assets. Skipping those is a performance
    // matter, not a security one: they carry no tenant data.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
