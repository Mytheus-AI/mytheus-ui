import type { Metadata } from "next";
import { Target } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Page, PageHead } from "@/components/ui/Page";
import { Crumb } from "@/components/app/Crumb";
import { TimeMachine, type TimeMachineData } from "@/components/time-machine/TimeMachine";
import { loadDiff, loadSnapshot, loadTimeline } from "@/app/actions/time-machine";
import { readState } from "@/lib/time-machine";

export const metadata: Metadata = { title: "Time machine | Mytheus" };

/* The company time machine ("Beyond the meeting", Layer 3): the decision graph as it stood on any
   date, what changed between two dates, and one topic step by step, from core-api's
   `/api/v1/time-machine/*` (only meetings the viewer was in). The first answer is read here, on
   the server, for the state in the URL; the scrubber then reads through the same server actions.
   A failed read is shown in place with Retry, not thrown, so the controls stay usable. */
export default async function TimeMachinePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  const today = new Date().toISOString().slice(0, 10);
  const state = readState(searchParams ?? {}, today);
  let data: TimeMachineData;
  let earliest: string | null = null;
  if (state.mode === "compare") {
    data = { mode: "compare", result: await loadDiff(state.from, state.to, state.topic) };
  } else if (state.mode === "topic") {
    data = { mode: "topic", result: state.topic ? await loadTimeline(state.topic) : null };
  } else {
    const result = await loadSnapshot(state.asOf, state.topic);
    if (result.ok) earliest = result.data.earliest ?? null;
    data = { mode: "as-of", result };
  }
  return (
    <Page>
      <Crumb label="Time machine" />
      <PageHead
        title="Time machine"
        context="See the company as it understood itself on any date: what was decided and why, who had promised what, and what changed since. Only meetings you were in."
        action={
          <LinkButton href="/decisions/calls" variant="outline">
            <Target size={16} aria-hidden />
            How good are our calls
          </LinkButton>
        }
      />
      <TimeMachine initial={state} initialData={data} today={today} earliest={earliest} />
    </Page>
  );
}
