"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { replaceAgenda } from "@/app/actions/agenda";
import { useCallToast } from "@/components/call/CallToast";
import { RoomDialog } from "@/components/room/RoomDialog";
import { itemsFromText } from "@/lib/agenda-quick-add";
import { AGENDA_LIMITS, type AgendaItem } from "@/lib/api/meeting-agenda-types";
import type { MeetingSocketState } from "@/lib/realtime/useMeetingSocket";

/* "Add agenda" in the room (UI polish pass): the host types the items, one per line, without
   leaving the call. core-api stores them (`PUT .../agenda`, host or creator only); this screen
   takes the stored rows at once and the gateway tells everyone else, who see the stage bar
   appear. Owners and minutes stay on the meeting page; the meeting agent tracks the items as
   people talk. */

export function AgendaQuickAdd({
  open,
  onClose,
  meetingId,
  host,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  host: MeetingSocketState["agendaHost"];
}) {
  const uid = useId();
  const toast = useCallToast();
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const items = itemsFromText(text);
  const tooMany = items.length > AGENDA_LIMITS.maxItems;
  const tooLong = items.some((t) => t.length > AGENDA_LIMITS.titleMax);

  useEffect(() => {
    if (!open) return;
    setText("");
    setError(null);
    window.requestAnimationFrame(() => area.current?.focus());
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (items.length === 0) return setError("Write at least one item.");
    if (tooMany) return setError(`An agenda holds at most ${AGENDA_LIMITS.maxItems} items.`);
    if (tooLong) return setError(`Keep each item under ${AGENDA_LIMITS.titleMax} characters.`);
    setBusy(true);
    setError(null);
    const res = await replaceAgenda(
      meetingId,
      items.map((title) => ({ title, owner_user_id: null, duration_minutes: null })),
    );
    setBusy(false);
    if (!res.ok) return setError(res.message);
    const rows: AgendaItem[] = res.items;
    host.replaceAll(rows);
    void host.announceReplaced(rows.map((r) => r.id)).then((ack) => {
      if (!ack.ok) toast("Saved. Others see the agenda when their room next checks in.", "info");
    });
    toast(`Agenda added: ${rows.length} ${rows.length === 1 ? "item" : "items"}`, "success");
    onClose();
  };

  return (
    <RoomDialog open={open} onClose={() => (busy ? undefined : onClose())} title="Add an agenda">
      <form onSubmit={submit} className="aq-form" noValidate>
        <p className="aq-lead" id={`${uid}-lead`}>
          One item per line. The meeting agent tracks them as you talk, and you can start them from the bar above the
          stage.
        </p>
        <label htmlFor={`${uid}-items`} className="aq-label">
          Items
        </label>
        <textarea
          ref={area}
          id={`${uid}-items`}
          className="aq-area"
          rows={6}
          value={text}
          placeholder={"Beta readiness\nLaunch date\nPricing questions"}
          aria-describedby={`${uid}-lead ${uid}-count${error ? ` ${uid}-err` : ""}`}
          aria-invalid={error ? true : undefined}
          disabled={busy}
          onChange={(e) => {
            setText(e.target.value);
            if (error) setError(null);
          }}
        />
        <p id={`${uid}-count`} className={`aq-count${tooMany ? " is-over" : ""}`} aria-live="polite">
          {items.length === 0
            ? `Up to ${AGENDA_LIMITS.maxItems} items`
            : `${items.length} ${items.length === 1 ? "item" : "items"}${tooMany ? `, more than ${AGENDA_LIMITS.maxItems}` : ""}`}
        </p>
        {error ? (
          <p id={`${uid}-err`} className="aq-err" role="alert">
            {error}
          </p>
        ) : null}
        <div className="room-dialog-acts">
          <button type="button" className="nfy-act is-quiet tap" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="nfy-act tap" disabled={busy} aria-busy={busy || undefined}>
            {busy ? "Adding..." : "Add agenda"}
          </button>
        </div>
      </form>
    </RoomDialog>
  );
}
