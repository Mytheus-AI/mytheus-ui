import type { Metadata } from "next";
import { ApiTokensPanel } from "@/components/settings/ApiTokensPanel";
import { ConnectedAppsPanel } from "@/components/settings/ConnectedAppsPanel";
import { ConnectToolsPanel } from "@/components/settings/ConnectToolsPanel";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionBar } from "@/components/ui/Page";
import { loadApiTokens } from "@/lib/api/api-tokens";
import { loadConnectedApps } from "@/lib/api/oauth";
import { apiOrigin } from "@/lib/api-access";

export const metadata: Metadata = { title: "API access | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > API access (Phase 4 reach): your personal access tokens (identity-tenant-service
   `/api/v1/api-tokens`), the apps you connected with Mytheus sign-in (OAuth, e.g. a Claude custom
   connector: `/api/v1/oauth/grants`), and how to point Claude, an IDE or a script at Mytheus (the
   MCP server at `/mcp` and the public `/api/v1/search` and `/api/v1/ask`). Personal: every token
   and connection is the caller's own and acts with the caller's access. A failed read shows an
   error with Retry, never an empty list that would invite creating duplicates. */
export default async function ApiAccessPage() {
  const [tokens, apps] = await Promise.all([loadApiTokens(), loadConnectedApps()]);
  const origin = apiOrigin(process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? process.env.API_GATEWAY_URL);
  return (
    <>
      <SectionBar title="API access" context="Connect Claude and other tools to your meetings, with Mytheus sign-in or a personal access token. Only you see your tokens and apps." />
      <div className="grid gap-5">
        {tokens.kind === "live" ? (
          <ApiTokensPanel initial={tokens.items} nowIso={new Date().toISOString()} />
        ) : (
          <ErrorState title="Your tokens could not be loaded" text="Nothing was changed. Existing tokens keep working while this page is unavailable." />
        )}
        {apps.kind === "live" ? (
          <ConnectedAppsPanel initial={apps.items} />
        ) : (
          <ErrorState title="Your connected apps could not be loaded" text="Nothing was changed. Connected apps keep working while this list is unavailable." />
        )}
        <ConnectToolsPanel origin={origin} />
      </div>
    </>
  );
}
