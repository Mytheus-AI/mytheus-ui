import { LockSimple, Quotes, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import type { DecisionAgreement } from "@/lib/api/room-signals-types";
import type { SignalRead } from "@/lib/api/room-signals";
import { agreementHeadline, agreementSegments, inMeetingLine, strengthChip, strengthSentence } from "@/lib/room-signals";
import { AgreementAsk } from "./AgreementAsk";

/* Agreement, on a decision's page (the fake-consensus detector, a3 room signals).

   - The decision's owner sees the totals: "3 of 5 actually support this", one calm stacked bar
     (support, concerns, object, not answered yet), the in-meeting read as counts, and the notes
     people put their name to (unsigned ones too, once three or more people answered; the server
     decides which it sends).
   - Everyone else sees only how strong the agreement was, and, if they were asked, their own
     private question to answer or change.
   Nobody ever sees another person's stance; nothing here ranks anyone. */

const NOTE_STANCE = { support: "supports it", concerns: "has concerns", object: "objects" } as const;

const BAR: Record<string, string> = {
  support: "bg-ok",
  concerns: "bg-priority-medium",
  object: "bg-priority-high",
  pending: "bg-bg-3",
};

export function AgreementCard({ read }: { read: SignalRead<DecisionAgreement> }) {
  if (!read.ok) {
    if (read.reason === "none") return null;
    return (
      <Card flush as="section" aria-labelledby="agreement-h">
        <CardHead id="agreement-h" title="Agreement" />
        <ErrorState variant="inline" title="The agreement read did not load" text="Nothing was lost. Try again in a moment." />
      </Card>
    );
  }
  const a = read.data;
  const chip = strengthChip(a.strength);
  const s = a.summary;
  const segments = s ? agreementSegments(s) : [];
  const counted = segments.reduce((n, x) => n + x.n, 0);

  return (
    <Card flush as="section" aria-labelledby="agreement-h">
      <CardHead
        id="agreement-h"
        title="Agreement"
        caption={a.you_own ? "For you, as this decision's owner" : undefined}
        right={chip ? <Chip tone={chip.tone}>{chip.label}</Chip> : a.strength === "strong" ? <Chip tone="ok">Clear agreement</Chip> : null}
      />
      <CardBody className="flex flex-col gap-4">
        {s && counted > 0 ? (
          <div>
            <p className="display text-[26px] leading-tight text-ink-display">{agreementHeadline(s)}</p>
            <div
              className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-bg-2"
              role="img"
              aria-label={segments.map((x) => `${x.label}: ${x.n}`).join(", ")}
            >
              {segments
                .filter((x) => x.n > 0)
                .map((x) => (
                  <span key={x.key} className={`${BAR[x.key]} h-full border-r-2 border-surface last:border-r-0`} style={{ width: `${x.pct}%` }} />
                ))}
            </div>
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[13.5px] text-ink-2" aria-hidden>
              {segments.map((x) => (
                <li key={x.key} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${BAR[x.key]} ${x.key === "pending" ? "border border-line-2" : ""}`} />
                  {x.label}
                  <span className="font-semibold tabular-nums text-ink">{x.n}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[14px] text-ink-3">{inMeetingLine(s)}</p>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed text-ink-2">{strengthSentence(a.strength)}</p>
        )}

        {a.you_own ? (
          <div>
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Quotes size={16} aria-hidden />
              Notes
            </h3>
            {a.notes.length === 0 ? (
              <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
                No notes yet. A note reaches you with a name only when its writer chose that, and unsigned only once three or more people
                answered.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2.5">
                {a.notes.map((n, i) => (
                  <li key={i} className="rounded-ctl bg-bg-2 px-3.5 py-2.5">
                    <p className="font-display text-[15px]  leading-snug text-ink-2">&ldquo;{n.text}&rdquo;</p>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      {n.author_name ?? "Unsigned"}, {NOTE_STANCE[n.answer]}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        <p className="flex items-start gap-1.5 text-[13px] leading-snug text-ink-3">
          <LockSimple size={14} className="mt-px shrink-0" aria-hidden />
          {a.you_own
            ? "People who hedged or stayed quiet were asked privately. You see totals, never who answered what."
            : "Only the decision's owner sees the totals, and never who answered what."}
        </p>

        {a.my_check ? (
          <div className="rounded-ctl border border-line bg-surface-2 p-3.5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <UsersThree size={16} aria-hidden />
              {a.my_check.status === "answered" ? "Your private answer" : "Where do you really stand?"}
            </h3>
            {a.my_check.status !== "answered" ? (
              <p className="mt-1 text-[14px] text-ink-3">You were asked because you hedged, stayed quiet or were talked over when this was decided.</p>
            ) : null}
            <AgreementAsk check={a.my_check} checkId={a.my_check.id} decisionLabel={a.my_check.decision_content} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
