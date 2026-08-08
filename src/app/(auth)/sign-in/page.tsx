import { SignIn } from "@clerk/nextjs";

/**
 * The real Clerk sign-in screen, replacing the 4-July auth bypass that redirected straight
 * to `/dashboard`.
 *
 * The session token this mints carries the Clerk organization claim that `api-gateway`
 * resolves to our `org_id` through `organizations.clerk_org_id`. The browser never sees that
 * `org_id`, which is why there is no organization picker here: switching organizations
 * re-authenticates through Clerk rather than changing anything this app holds.
 */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <SignIn
        // Path routing so Clerk's multi-step flows (second factor, SSO callback, reset) stay
        // inside this route instead of bouncing to a hosted page mid-sign-in.
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
