import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ConsentFlow } from "@/components/oauth/ConsentFlow";
import { ConsentFrame } from "@/components/oauth/ConsentFrame";
import { ConsentProblemView } from "@/components/oauth/ConsentProblemView";
import { loadConsent } from "@/lib/api/oauth";
import { consentPath, problemFromAuthorizeError } from "@/lib/oauth-consent";
import "@/styles/app-theme.css";

/* `/oauth/consent`: where an app such as Claude sends you to approve its access (identity's
   `GET /oauth/authorize` redirects here with a signed `request`, or with an `error` when it could
   not trust the request enough to send you back to the app). Signed in: the middleware sends a
   signed-out visitor through Clerk sign-in and back here with the request intact. The page reads
   the request from identity, which re-validates it and the app on every read. */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an app | Mytheus",
  robots: { index: false, follow: false, nocache: true },
  // The URL carries the signed request; never send it to the app as a Referer.
  referrer: "no-referrer",
};

type Search = { request?: string | string[]; error?: string | string[] };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function ConsentPage({ searchParams }: { searchParams: Search }) {
  const authorizeProblem = problemFromAuthorizeError(one(searchParams.error));
  if (authorizeProblem) {
    return (
      <ConsentFrame>
        <ConsentProblemView problem={authorizeProblem} />
      </ConsentFrame>
    );
  }
  const request = one(searchParams.request);
  if (!request) {
    return (
      <ConsentFrame>
        <ConsentProblemView problem="missing_request" />
      </ConsentFrame>
    );
  }
  const load = await loadConsent(request);
  if (load.kind === "signed_out") redirect(`/sign-in?redirect_url=${encodeURIComponent(consentPath(request))}`);
  if (load.kind === "problem") {
    return (
      <ConsentFrame>
        <ConsentProblemView problem={load.problem} />
      </ConsentFrame>
    );
  }
  return (
    <ConsentFrame email={load.details.account_email}>
      <ConsentFlow details={load.details} request={request} />
    </ConsentFrame>
  );
}
