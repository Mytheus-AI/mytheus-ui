import { CheckCircle, Prohibit, TrendUp } from "@phosphor-icons/react";
import { parseStatusText, type StatusRequestView } from "@/lib/api/personal-types";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { LocalWhen } from "./LocalWhen";

const CHIP = {
  on_track: { label: "On track", tone: "low", Icon: TrendUp },
  blocked: { label: "Blocked", tone: "medium", Icon: Prohibit },
  done: { label: "Done", tone: "ok", Icon: CheckCircle },
} as const satisfies Record<string, { label: string; tone: ChipTone; Icon: unknown }>;

/** An answered request: the action, the pick as a chip, the line, and when and for which meeting. */
export function AnsweredRow({ req, nowIso, sending }: { req: StatusRequestView; nowIso: string; sending: boolean }) {
  const { pick, note } = parseStatusText(req.status_text);
  const chip = pick ? CHIP[pick] : null;
  return (
    <li aria-busy={sending || undefined} className="grid gap-x-6 gap-y-1.5 px-4 py-3.5 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
      <div className="min-w-0">
        <p className="text-[14px] font-medium leading-snug text-ink">{req.actionTitle}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {sending ? (
            "Sending"
          ) : (
            <>
              {req.answered_at ? (
                <>
                  Answered <LocalWhen iso={req.answered_at} nowIso={nowIso} mode="past" />
                </>
              ) : (
                "Answered"
              )}
              , for {req.meetingTitle}
            </>
          )}
        </p>
      </div>
      <p className="flex min-w-0 flex-wrap items-center gap-2 text-[14px] text-ink-2">
        {chip ? (
          <Chip tone={chip.tone} icon={<chip.Icon size={13} weight="fill" />}>
            {chip.label}
          </Chip>
        ) : null}
        {note ? <span className="min-w-0 break-words">{note}</span> : null}
      </p>
    </li>
  );
}
