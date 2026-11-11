import { Toaster } from "../../src/components/ui/Toaster";
import { ConsentCard } from "../../src/components/oauth/ConsentCard";
import { ConsentFlow } from "../../src/components/oauth/ConsentFlow";
import { ConsentProblemView } from "../../src/components/oauth/ConsentProblemView";
import { SignedInAs } from "../../src/components/oauth/SignedInAs";
import { Wordmark } from "../../src/components/site/Wordmark";
import { ConnectedAppsPanel } from "../../src/components/settings/ConnectedAppsPanel";
import { ConnectToolsPanel } from "../../src/components/settings/ConnectToolsPanel";
import type { ConsentDetailsView } from "../../src/components/oauth/ConsentCard";
import type { ConsentProblem } from "../../src/lib/oauth-consent";

/* The OAuth surfaces as the app renders them: the consent page's frame and card (or one of its
   problem states), and Settings > API access's Connected apps and Claude connector steps. Server
   reads are props; server actions are the canned answers in stubs/actions.ts. The frame is drawn
   inline (ConsentFrame itself is a server component with an inline theme script). */

const CLAUDE: ConsentDetailsView = {
  client: { client_id: "mcp_Q2xhdWRlRGVza3RvcA", name: "Claude", redirect_host: "claude.ai", verified_redirect: true, loopback_redirect: false },
  scope: "read_write",
  workspace: { name: "Acme" },
  account_email: "maya@example.com",
};

const LOOPBACK: ConsentDetailsView = {
  ...CLAUDE,
  client: { client_id: "mcp_bG9vcGJhY2s", name: "Claude Code", redirect_host: "localhost", verified_redirect: false, loopback_redirect: true },
  scope: "read",
};

const UNKNOWN_HOST: ConsentDetailsView = {
  ...CLAUDE,
  client: { client_id: "mcp_dW5rbm93bg", name: "Notes helper", redirect_host: "notes.example.com", verified_redirect: false, loopback_redirect: false },
};

const apps = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    client_id: "mcp_a",
    client_name: "Claude",
    redirect_host: "claude.ai",
    verified_redirect: true,
    scope: "read_write" as const,
    connected_at: "2026-11-09T10:00:00Z",
    last_used_at: "2026-11-11T08:30:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    client_id: "mcp_b",
    client_name: "Claude Code",
    redirect_host: "localhost",
    verified_redirect: false,
    scope: "read" as const,
    connected_at: "2026-11-02T10:00:00Z",
    last_refreshed_at: "2026-11-10T12:00:00Z",
  },
];

const VARIANTS = { claude: CLAUDE, loopback: LOOPBACK, unknown: UNKNOWN_HOST };

export function ConsentHarness({
  theme = "light",
  variant = "claude",
  request = "signed-request",
  problem,
}: {
  theme?: "light" | "dark";
  variant?: keyof typeof VARIANTS;
  request?: string;
  problem?: ConsentProblem;
}) {
  const details = VARIANTS[variant];
  return (
    <div className="mx-app flex min-h-dvh flex-col bg-bg text-ink-2" data-theme={theme}>
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 pt-5 sm:px-8 sm:pt-6">
        <span aria-label="Mytheus" className="inline-flex">
          <Wordmark size={22} textClassName="text-[20px]" />
        </span>
        {problem ? null : <SignedInAs email={details.account_email ?? "maya@example.com"} />}
      </header>
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 pb-12 pt-6 sm:px-8 sm:pt-10">
        {problem ? <ConsentProblemView problem={problem} /> : request === "expired" ? <ConsentFlow details={details} request={request} /> : <ConsentCard details={details} request={request} />}
      </main>
    </div>
  );
}

export function ConnectedAppsHarness({ theme = "light", empty = false }: { theme?: "light" | "dark"; empty?: boolean }) {
  return (
    <div className="mx-app min-h-dvh bg-bg p-4 sm:p-8" data-theme={theme}>
      <main className="mx-auto flex max-w-[1200px] flex-col gap-5">
        <h1 className="display text-[30px] text-ink-display">API access</h1>
        <ConnectedAppsPanel initial={empty ? [] : apps} />
        <ConnectToolsPanel origin="https://api.mytheus.cloud" />
      </main>
      <Toaster />
    </div>
  );
}
