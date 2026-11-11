"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { sendSettleMessage } from "@/app/actions/settlements";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { Settlement } from "@/lib/api/why-blast-types";
import { SETTLE_LIMITS, checkMessage, ownerName } from "@/lib/settlements";

/* The short thread between the two owners, newest last, with a compose box under it. Ctrl or Cmd
   with Enter sends. A sent message goes to the other owner as a notification. */

const stamp = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
};

export function SettleMessages({ settlement, onChange }: { settlement: Settlement; onChange: (s: Settlement) => void }) {
  const uid = useId();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLOListElement>(null);
  const count = settlement.messages.length;

  useEffect(() => {
    const list = end.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [count]);

  const send = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const check = checkMessage(body);
    if (!check.ok) {
      setErr(check.message);
      return;
    }
    setBusy(true);
    const res = await sendSettleMessage(settlement.id, check.body);
    setBusy(false);
    if (!res.ok) {
      setErr(res.message);
      return;
    }
    setBody("");
    onChange(res.data);
  };

  return (
    <section aria-labelledby={`${uid}-h`} className={cardClass({ flush: true })}>
      <CardHead
        id={`${uid}-h`}
        title="Talk it through"
        description={`Messages go to ${ownerName(settlement.theirs)}. Only the two of you can read this thread.`}
        divided
      />
      {count === 0 ? (
        <p className="px-4 py-6 text-[15px] text-ink-3 sm:px-[22px]">No messages yet. Ask what you need to know before you settle it.</p>
      ) : (
        <ol ref={end} tabIndex={0} aria-label="Messages" className="max-h-[420px] space-y-4 overflow-y-auto px-4 py-5 sm:px-[22px]">
          {settlement.messages.map((m) => (
            <li key={m.id} className={`flex items-end gap-2.5 ${m.mine ? "flex-row-reverse" : ""}`}>
              <Avatar name={m.author?.name ?? "Someone"} size="sm" />
              <div className={`min-w-0 max-w-[78%] rounded-card px-3.5 py-2.5 ${m.mine ? "bg-signal-soft" : "bg-bg-2"}`}>
                <p className="text-[12.5px] font-semibold text-ink-3">
                  {m.mine ? "You" : (m.author?.name ?? "Someone")}
                  <span className="font-normal">, {stamp(m.created_at)}</span>
                </p>
                <p className="mt-0.5 whitespace-pre-line break-words text-[15px] leading-snug text-ink">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={send} className="border-t border-line bg-surface-2 px-4 py-4 sm:px-[22px]" noValidate>
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${uid}-msg`} className="text-[14px] font-semibold text-ink">
            Message
          </label>
          <CharCount n={body.trim().length} max={SETTLE_LIMITS.message} />
        </div>
        <textarea
          id={`${uid}-msg`}
          rows={2}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Does your pricing change apply to existing customers too?"
          aria-invalid={Boolean(err)}
          aria-describedby={`${uid}-msg-hint`}
          className={`${textareaClass} mt-2`}
        />
        <FieldMsg id={`${uid}-msg-hint`} error={err} hint="Ctrl or Cmd with Enter sends." />
        <Button type="submit" size="sm" className="mt-3" disabled={busy} aria-busy={busy}>
          <PaperPlaneTilt size={15} aria-hidden />
          {busy ? "Sending" : "Send message"}
        </Button>
      </form>
    </section>
  );
}
