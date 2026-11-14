import { OrgProvider } from "../../src/lib/org-context";
import { MyAgentProvider } from "../../src/lib/my-agent";
import { CrumbProvider } from "../../src/components/app/Crumb";
import { Toaster } from "../../src/components/ui/Toaster";
import { AskMytePage } from "../../src/components/ask-myte/AskMytePage";
import { AskMyteLayer, AskMyteProvider } from "../../src/components/ask-myte/AskMyteProvider";
import { AskAboutButton, AskBox } from "../../src/components/ask-myte/AskBox";
import { STARTERS, THREAD, THREADS, M } from "./ask-myte-fixture";

/* Ask Myte in the component harness: the /ask page (empty, or a deep-linked thread) and the ⌘J
   sheet over a stand-in page with the entry points. Server actions come from stubs/actions.ts;
   `/api/ask-myte` is answered by the spec with `page.route`. */

const PERSONA = { name: "Pip", seed: "agent:u-sushan", personality: "friendly" };
const ORG = {
  org: { id: "org-1", name: "Mytheus" },
  user: { id: "u-sushan", name: "Sushan Shetty", email: "sushan@example.com", role: "admin" as const, avatarSeed: "abcd2345" },
};

export function AskMyteHarness({
  theme = "light",
  view = "page",
  thread = false,
}: {
  theme?: "light" | "dark";
  view?: "page" | "sheet";
  thread?: boolean;
}) {
  return (
    <OrgProvider value={ORG}>
      <MyAgentProvider value={{ name: PERSONA.name, seed: PERSONA.seed, personality: PERSONA.personality }}>
        <CrumbProvider>
          <AskMyteProvider>
            <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ minHeight: "100dvh" }}>
              {view === "page" ? (
                <main style={{ padding: "4px 32px 48px" }}>
                  <AskMytePage
                    persona={PERSONA}
                    viewer={{ name: ORG.user.name, email: ORG.user.email, seed: ORG.user.avatarSeed }}
                    firstName="Sushan"
                    isAdmin
                    initialThread={thread ? THREAD : null}
                    initialThreads={THREADS}
                    starters={STARTERS}
                    autoSend={null}
                    initialScope={null}
                    goneThread={false}
                  />
                </main>
              ) : (
                <main style={{ maxWidth: 820, padding: "32px", display: "flex", flexDirection: "column", gap: 20 }}>
                  <h1 className="display text-[30px]">Feature Update - Backend</h1>
                  <div style={{ display: "flex", gap: 10 }}>
                    <AskAboutButton kind="meeting" id={M} title="Feature Update - Backend" />
                  </div>
                  <AskBox name="Pip" seed={PERSONA.seed} placeholder="Ask Pip about your day..." starters={[{ question: "Prep me for Test" }, { question: "What do I owe this week?", hint: "4 open tasks" }]} sheet />
                </main>
              )}
              <AskMyteLayer />
              <Toaster />
            </div>
          </AskMyteProvider>
        </CrumbProvider>
      </MyAgentProvider>
    </OrgProvider>
  );
}
