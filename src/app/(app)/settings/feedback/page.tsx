import type { Metadata } from "next";
import { SectionCard, cardPad } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { SectionBar } from "@/components/ui/Page";
import { ReportBug } from "@/components/settings/ReportBug";
import { loadMyFeedback } from "@/lib/api/admin-tenant";
import { FEEDBACK_STATUS_LABEL, type FeedbackStatus } from "@/lib/ops";
import { zonedFormat } from "@/lib/timezone-server";

export const metadata: Metadata = { title: "Report a bug | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Report a bug (ADR-0046 D6): a bug report or feedback goes straight to the Mytheus
   team's inbox. Below it, what this person has sent and whether the team has seen it. */

const TONE: Record<FeedbackStatus, ChipTone> = { new: "neutral", seen: "low", resolved: "ok" };
const fmt = (iso: string) => (Number.isNaN(Date.parse(iso)) ? "" : zonedFormat({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)));

export default async function FeedbackSettingsPage() {
  const res = await loadMyFeedback();
  const sent = res.kind === "live" ? res.data : [];

  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Report a bug"
        context="Found something broken, or have an idea? Tell the Mytheus team directly. We read every report."
      />

      <SectionCard title="Tell us" headingLevel={3} headingId="tell-heading" description="It goes to the team with your email, so we can ask a follow-up or let you know when it is fixed.">
        <div className={cardPad}>
          <ReportBug />
        </div>
      </SectionCard>

      <SectionCard title="What you have sent" headingLevel={3} headingId="sent-heading">
        {res.kind === "unavailable" ? (
          <p className={`${cardPad} text-[14px] text-ink-3`}>Your reports could not be loaded just now.</p>
        ) : sent.length === 0 ? (
          <p className={`${cardPad} text-[14px] text-ink-3`}>Nothing yet.</p>
        ) : (
          <ul className="m-0 list-none divide-y divide-line p-0">
            {sent.map((r) => (
              <li key={r.id} className={`${cardPad} flex flex-col gap-1.5`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Chip tone={r.kind === "bug" ? "medium" : "neutral"}>{r.kind === "bug" ? "Bug" : "Feedback"}</Chip>
                  <Chip tone={TONE[r.status] ?? "neutral"}>{FEEDBACK_STATUS_LABEL[r.status] ?? r.status}</Chip>
                  <span className="text-[13px] tabular-nums text-ink-3">{fmt(r.created_at)}</span>
                </div>
                <p className="whitespace-pre-line break-words text-[15px] leading-relaxed text-ink-2">{r.message}</p>
                {r.page ? <p className="text-[13px] text-ink-3">Where: {r.page}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
