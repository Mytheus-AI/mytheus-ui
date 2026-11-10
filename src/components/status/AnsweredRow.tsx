import { CheckCircle, Prohibit, TrendUp } from "@phosphor-icons/react";
import { parseStatusText, type StatusRequestView } from "@/lib/api/personal-types";
import { LocalWhen } from "./LocalWhen";

const CHIP = {
  on_track: { label: "On track", cls: "bg-priority-low-soft text-priority-low", Icon: TrendUp },
  blocked: { label: "Blocked", cls: "bg-priority-medium-soft text-priority-medium", Icon: Prohibit },
  done: { label: "Done", cls: "bg-ok-soft text-ok", Icon: CheckCircle },
} as const;

/** An answered request: the action, the pick as a chip, the line, and when and for which meeting. */
export function AnsweredRow({ req, nowIso, sending }: { req: StatusRequestView; nowIso: string; sending: boolean }) {
  const { pick, note } = parseStatusText(req.status_text);
  const chip = pick ? CHIP[pick] : null;
  return (
    <li aria-busy={sending || undefined} className="grid gap-x-6 gap-y-1.5 px-[18px] py-3.5 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
      <div className="min-w-0">
        <p className="text-[14.5px] font-medium leading-snug text-ink">{req.actionTitle}</p>
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
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold ${chip.cls}`}>
            <chip.Icon size={13} weight="fill" aria-hidden />
            {chip.label}
          </span>
        ) : null}
        {note ? <span className="min-w-0 break-words">{note}</span> : null}
      </p>
    </li>
  );
}
