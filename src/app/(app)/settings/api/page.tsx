import type { Metadata } from "next";
import { ApiTokensPanel } from "@/components/settings/ApiTokensPanel";
import { ConnectToolsPanel } from "@/components/settings/ConnectToolsPanel";
import { ErrorState } from "@/components/ui/ErrorState";
import { SectionBar } from "@/components/ui/Page";
import { loadApiTokens } from "@/lib/api/api-tokens";
import { apiOrigin } from "@/lib/api-access";

export const metadata: Metadata = { title: "API access | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > API access (Phase 4 reach): your personal access tokens (identity-tenant-service
   `/api/v1/api-tokens`) and how to point Claude, an IDE or a script at Mytheus (the MCP server at
   `/mcp` and the public `/api/v1/search` and `/api/v1/ask`). Personal: every token is the
   caller's own and acts with the caller's access. A failed token read shows an error with Retry,
   never an empty list that would invite creating duplicates. */
export default async function ApiAccessPage() {
  const tokens = await loadApiTokens();
  const origin = apiOrigin(process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? process.env.API_GATEWAY_URL);
  return (
    <>
      <SectionBar title="API access" context="Connect Claude and other tools to your meetings with a personal access token. Only you see your tokens." />
      <div className="grid gap-5">
        {tokens.kind === "live" ? (
          <ApiTokensPanel initial={tokens.items} nowIso={new Date().toISOString()} />
        ) : (
          <ErrorState title="Your tokens could not be loaded" text="Nothing was changed. Existing tokens keep working while this page is unavailable." />
        )}
        <ConnectToolsPanel origin={origin} />
      </div>
    </>
  );
}
