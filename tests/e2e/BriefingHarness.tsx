import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { BriefingPlayer } from "../../src/components/briefing/BriefingPlayer";
import { BriefingSettingsPanel } from "../../src/components/briefing/BriefingSettingsPanel";
import { BRIEFING, EMPTY, FAILED, SETTINGS, WRITING } from "./briefing-fixture";
import { VOICES } from "./voice-fixture";

/* The briefing surfaces as the app renders them: the after page's full player, Home's compact
   player, every other state, and Settings > Briefings. Server reads are props; the server
   actions are stubs/actions.ts. */

export type BriefingView = "after" | "home" | "states" | "settings";

export function BriefingHarness({ theme = "light", view = "after" }: { theme?: "light" | "dark"; view?: BriefingView }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "member" } }}>
      <div className="mx-app min-h-dvh bg-bg p-4 text-ink sm:p-8" data-theme={theme}>
        <main className="mx-auto flex max-w-[1100px] flex-col gap-6">
          <h1 className="display text-[30px] text-ink-display">{view === "settings" ? "Settings" : view === "home" ? "Good morning, Maya" : "Pricing review"}</h1>
          {view === "after" ? <BriefingPlayer initial={BRIEFING} meetingId={BRIEFING.meeting_id} preferences={SETTINGS} variant="full" /> : null}
          {view === "home" ? (
            <div className="grid items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_340px]">
              <BriefingPlayer initial={BRIEFING} preferences={SETTINGS} variant="compact" />
              <aside className="rounded-card border border-line bg-surface p-5 text-[15px] text-ink-2">Today</aside>
            </div>
          ) : null}
          {view === "states" ? (
            <div className="grid gap-5 lg:grid-cols-2">
              <BriefingPlayer initial={null} meetingId={BRIEFING.meeting_id} preferences={SETTINGS} />
              <BriefingPlayer initial={WRITING} meetingId={BRIEFING.meeting_id} preferences={SETTINGS} />
              <BriefingPlayer initial={EMPTY} meetingId={BRIEFING.meeting_id} preferences={SETTINGS} />
              <BriefingPlayer initial={FAILED} meetingId={BRIEFING.meeting_id} preferences={SETTINGS} />
              <BriefingPlayer initial={null} meetingId={BRIEFING.meeting_id} canRequest={false} preferences={null} />
              <BriefingPlayer initial={null} enabled={false} preferences={SETTINGS} />
            </div>
          ) : null}
          {view === "settings" ? (
            <div className="max-w-[880px]">
              <h2 className="display mb-4 text-[24px] text-ink-display">Briefings</h2>
              <BriefingSettingsPanel initial={SETTINGS} agentName="Juniper" agentSeed="agent-seed-juniper" voices={VOICES} />
            </div>
          ) : null}
        </main>
      </div>
      <Toaster />
    </OrgProvider>
  );
}
