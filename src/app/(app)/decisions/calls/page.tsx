import type { Metadata } from "next";
import { ClockCounterClockwise } from "@phosphor-icons/react/dist/ssr";
import { LinkButton } from "@/components/ui/Button";
import { Page, PageHead } from "@/components/ui/Page";
import { Crumb } from "@/components/app/Crumb";
import { CallsReport } from "@/components/bets/CallsReport";
import { fetchCalibration, fetchMyBets } from "@/lib/api/bets";

export const metadata: Metadata = { title: "How good are our calls | Mytheus" };

/* How good are our calls (decisions as bets, "Beyond the meeting" Layer 3): the workspace's
   record on its own judgement, from `GET /api/v1/bets/calibration` (aggregates only, any member)
   and the caller's own bets that wait for them (`GET /api/v1/bets/mine`). A failed calibration
   read is thrown to `error.tsx`; a failed personal list only empties that card. */
export default async function CallsPage() {
  const [cal, mine] = await Promise.all([fetchCalibration(), fetchMyBets().catch(() => null)]);
  return (
    <Page>
      <Crumb label="How good are our calls" />
      <PageHead
        title="How good are our calls"
        context="Every decision can carry a bet on what it will achieve. When the date comes, its owner scores it. This is what the workspace learns from them."
        action={
          <LinkButton href="/decisions/time-machine" variant="outline">
            <ClockCounterClockwise size={16} aria-hidden />
            Time machine
          </LinkButton>
        }
      />
      <CallsReport cal={cal} mine={mine?.items ?? null} today={new Date().toISOString().slice(0, 10)} />
    </Page>
  );
}
