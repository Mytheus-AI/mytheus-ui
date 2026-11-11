"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { CalendarCheck, Clock } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { Bone } from "@/components/ui/Page";
import type { Act, BookedMeeting, SlotProposal } from "@/lib/api/why-blast-types";

/* Book a short meeting your agent proposed: it reads the proposal (the first free slot for
   everyone), shows the time and the people, lets you pick another time, then books. Used for a
   15-minute revisit of a decision whose reason broke, and for two owners settling a clash. */

const dayTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .replace(/, (\d{1,2}:\d{2}\s?[AP]M)$/, " at $1");

/** "2026-11-12T09:30" in the viewer's own zone, for a datetime-local field. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function minutesBetween(a: string, b: string): number {
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
}

export function SlotDialog({
  open,
  onClose,
  title,
  description,
  loadSlot,
  book,
  bookLabel,
  onBooked,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  loadSlot: () => Promise<Act<SlotProposal>>;
  book: (start: string | null) => Promise<Act<BookedMeeting>>;
  bookLabel: string;
  onBooked: (m: BookedMeeting) => void;
}) {
  const uid = useId();
  const [slot, setSlot] = useState<SlotProposal | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSlot = useCallback(async () => {
    setSlot(null);
    setLoadError(null);
    const res = await loadSlot();
    if (res.ok) {
      setSlot(res.data);
      setWhen(toLocalInput(res.data.start));
    } else setLoadError(res.message);
  }, [loadSlot]);

  useEffect(() => {
    if (open) {
      setError(null);
      void fetchSlot();
    }
    // Read once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!slot || busy) return;
    const picked = when ? new Date(when) : null;
    if (when && (!picked || Number.isNaN(picked.getTime()))) {
      setError("Pick a date and time.");
      return;
    }
    const changed = picked && toLocalInput(slot.start) !== when ? picked.toISOString() : null;
    if (changed && Date.parse(changed) < Date.now() + 5 * 60_000) {
      setError("Pick a time in the future.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await book(changed);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    onBooked(res.data);
    onClose();
  };

  const length = slot ? minutesBetween(slot.start, slot.end) : 15;

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description} busy={busy}>
      {loadError ? (
        <ErrorState variant="inline" className="!px-0" title="No time found yet" text={loadError} onRetry={() => void fetchSlot()} />
      ) : !slot ? (
        <div role="status" aria-label="Finding a time" className="space-y-3">
          <Bone className="h-[72px] w-full" />
          <Bone className="h-4 w-2/3" />
          <span className="sr-only">Your agent is finding a time that suits everyone</span>
          <p className="text-[14px] text-ink-3">Your agent is finding a time that suits everyone.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-card bg-bg-2 px-4 py-3.5">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-3">
              <CalendarCheck size={16} aria-hidden />
              Your agent proposes
            </p>
            <p className="mt-1 text-[17px] font-semibold text-ink">{dayTime(slot.start)}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-ink-3">
              <Clock size={14} aria-hidden />
              {length} minutes, {slot.title}
            </p>
          </div>

          {slot.people.length > 0 ? (
            <div>
              <p className="text-[14px] font-semibold text-ink">Who is invited</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {slot.people.map((p) => (
                  <li key={p.user_id} className="inline-flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1 pr-3 text-[14px] text-ink-2">
                    <Avatar name={p.name} size="xs" />
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <label htmlFor={`${uid}-when`} className="text-[14px] font-semibold text-ink">
              Change the time
            </label>
            <input
              id={`${uid}-when`}
              type="datetime-local"
              value={when}
              step={900}
              onChange={(e) => setWhen(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={`${uid}-msg`}
              className={`${fieldClass} mt-2`}
            />
            <FieldMsg id={`${uid}-msg`} error={error} hint="In your own time zone. Leave it to book the proposed time." />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button type="button" onClick={() => void submit()} disabled={busy} aria-busy={busy}>
              <CalendarCheck size={16} aria-hidden />
              {busy ? "Booking" : bookLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
