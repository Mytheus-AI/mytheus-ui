"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { connectIntegration, disconnectIntegration } from "@/lib/api/integrations";
import { isConnectable, safeHttpsUrl } from "@/lib/integrations";

/* Connect and Disconnect for /settings/integrations (Phase P12, plan 3.14). Both are plain form
   actions, so they work without client JavaScript. The tenant and the user come from the session
   at the edge, never from the form; the only input is the provider key, checked against the three
   that can be connected (Linear never can, R8).

   Connect asks integration-service for an authorize URL and sends the browser there. The provider
   returns to /settings/integrations/callback/{provider}, which finishes the exchange under the
   same session and lands on /settings/integrations?connected=... or ?error=..., so failures here
   reuse the same return banner. */

const BACK = "/settings/integrations";

function errorParam(err: unknown): string {
  if (err instanceof ApiError) {
    const code = String(err.code);
    if (code === "PROVIDER_NOT_CONFIGURED") return "not_configured";
    if (code === "PM_ALREADY_CONNECTED") return "pm_already_connected";
    if (err.isAuthFailure) return "session_expired";
    if (err.status === 403) return "forbidden";
  }
  return "connect_failed";
}

export async function connectProvider(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isConnectable(provider)) redirect(`${BACK}?error=invalid_provider`);

  let target: string | null = null;
  try {
    target = safeHttpsUrl((await connectIntegration(provider)).authorize_url);
  } catch (err) {
    redirect(`${BACK}?error=${errorParam(err)}`);
  }
  // `redirect` throws, so it must sit outside the try above.
  redirect(target ?? `${BACK}?error=connect_failed`);
}

export async function disconnectProvider(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (!isConnectable(provider)) redirect(`${BACK}?error=invalid_provider`);

  let failed: string | null = null;
  try {
    await disconnectIntegration(provider);
  } catch (err) {
    // Already disconnected elsewhere: the goal state holds.
    if (!(err instanceof ApiError && err.status === 404)) {
      failed = err instanceof ApiError && err.status === 403 ? "forbidden" : "disconnect_failed";
    }
  }
  revalidatePath(BACK);
  redirect(failed ? `${BACK}?error=${failed}` : `${BACK}?disconnected=${provider}`);
}
