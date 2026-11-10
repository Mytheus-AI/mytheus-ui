import { redirect } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { completeOAuth } from "@/lib/api/integrations";
import { callbackOutcome, readCallback } from "@/lib/integrations";

export const dynamic = "force-dynamic";

/* The OAuth return page, inside the signed-in app (middleware requires a session here), so the
   exchange runs under the session of the user who pressed Connect. The provider is checked
   against google_calendar, slack and jira before any call; the code and state are sent once to
   integration-service in a JSON body and are never rendered, put in a URL or logged. The page
   renders nothing: it always redirects to /settings/integrations with ?connected= or ?error=. */
export default async function IntegrationCallbackPage({
  params,
  searchParams,
}: {
  params: { provider: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const input = readCallback(params.provider, searchParams);
  if (input.kind === "done") redirect(input.location);

  let location: string;
  try {
    await completeOAuth(input.provider, input.code, input.state);
    location = callbackOutcome(input.provider, { ok: true });
  } catch (err) {
    location = callbackOutcome(
      input.provider,
      err instanceof ApiError ? { ok: false, status: err.status, code: String(err.code) } : { ok: false, status: 0, code: "" },
    );
  }
  // `redirect` throws, so it sits outside the try above.
  redirect(location);
}
