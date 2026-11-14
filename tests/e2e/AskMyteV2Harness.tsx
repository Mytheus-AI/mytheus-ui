import { OrgProvider } from "../../src/lib/org-context";
import { MyAgentProvider } from "../../src/lib/my-agent";
import { CrumbProvider } from "../../src/components/app/Crumb";
import { Toaster } from "../../src/components/ui/Toaster";
import { AskMyteLayer, AskMyteProvider } from "../../src/components/ask-myte/AskMyteProvider";
import { TodayFromMyte } from "../../src/components/ask-myte/TodayFromMyte";
import { PeerQuestionsSection } from "../../src/components/inbox/PeerQuestions";
import { MyteMemoryCard } from "../../src/components/agent/MyteMemoryCard";
import { MyteRoutinesCard } from "../../src/components/agent/MyteRoutinesCard";
import { PeerQuestionCard } from "../../src/components/ask-myte/PeerQuestionCard";
import { MEMORIES, NUDGE_DATA, PEER_INBOX, PEER_SENT, ROUTINES } from "./ask-myte-v2-fixture";

/* Ask Myte v2 surfaces in the component harness (ADR-0049): the Inbox's questions for your Myte
   and its review sheet, Your Myte's memory and routines cards, Home's "Today from Myte" with the
   floating Myte's nudge, and the asker's waiting card. Server actions come from stubs/actions.ts;
   `/api/ask-myte` is answered by the spec with `page.route`. */

const PERSONA = { name: "Pip", seed: "agent:u-sushan", personality: "friendly" };
const ORG = {
  org: { id: "org-1", name: "Mytheus" },
  user: { id: "88888888-8888-4888-8888-888888888880", name: "Sushan Shetty", email: "sushan@example.com", role: "admin" as const, avatarSeed: "abcd2345" },
};

export function AskMyteV2Harness({ theme = "light", view, openPeer = false }: { theme?: "light" | "dark"; view: "inbox" | "yourmyte" | "home" | "waiting"; openPeer?: boolean }) {
  // Home turns the stubbed nudges on (stubs/actions.ts returns none otherwise).
  if (view === "home" && typeof window !== "undefined") (window as unknown as { __v2Nudges?: boolean }).__v2Nudges = true;
  return (
    <OrgProvider value={ORG}>
      <MyAgentProvider value={PERSONA}>
        <CrumbProvider>
          <AskMyteProvider>
            <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ minHeight: "100dvh" }}>
              <main style={{ maxWidth: view === "home" ? 420 : 860, margin: "0 auto", padding: "32px 16px 120px" }}>
                <h1 className="display mb-5 text-[30px] text-ink">{view === "inbox" ? "Inbox" : view === "yourmyte" ? "Your Myte" : view === "home" ? "Home" : "Ask Pip"}</h1>
                {view === "inbox" ? <PeerQuestionsSection initial={PEER_INBOX} openId={openPeer ? PEER_INBOX[0].id : null} nowIso={new Date().toISOString()} /> : null}
                {view === "yourmyte" ? (
                  <div className="flex flex-col gap-5">
                    <MyteMemoryCard initial={MEMORIES} name="Pip" />
                    <MyteRoutinesCard initial={ROUTINES} name="Pip" />
                  </div>
                ) : null}
                {view === "home" ? <TodayFromMyte data={NUDGE_DATA} name="Pip" seed={PERSONA.seed} /> : null}
                {view === "waiting" ? <PeerQuestionCard initial={PEER_SENT} /> : null}
              </main>
              {view === "home" ? <AskMyteLayer /> : null}
              <Toaster />
            </div>
          </AskMyteProvider>
        </CrumbProvider>
      </MyAgentProvider>
    </OrgProvider>
  );
}
