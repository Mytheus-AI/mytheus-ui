import { SignUp } from "@clerk/nextjs";

/**
 * The real Clerk sign-up screen, replacing the 4-July auth bypass.
 *
 * Signing up creates a Clerk user, NOT a tenant. Tenant provisioning is
 * `POST /api/v1/orgs`, which is deliberately deferred (it returns nothing yet, and an
 * operator seed script stands in), so a brand-new user with no organization membership will
 * authenticate and then be refused by the gateway: their token carries no organization to
 * resolve. That is the correct behaviour for now rather than a bug to paper over here, and it
 * is why self-serve signup is not advertised on the marketing pages.
 */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
