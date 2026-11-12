"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { FieldMsg, FieldRow, InlineRow, TextInput } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { Toggle } from "@/components/settings/Toggle";
import { notifyError, notifySuccess } from "@/lib/toast";
import { saveListeningPreferences } from "@/app/actions/listening";
import type { FocusBlock, ListeningPreferences, ListeningPreferencesView } from "@/lib/api/listening-types";
import { DAY_SHORT, clock, focusBlockError, focusBlockLabel, rightNowLine } from "@/lib/listening";

/* When your Myte may interrupt you (In every meeting at once). One form: the switches and fields
   change a draft, and "Save changes" writes it (with Undo); nothing is half-saved. What it holds:

   - interruptions on or off, and at most N an hour (whatever is over the limit is held for the
     evening digest, never dropped);
   - quiet hours (overnight works: 22:00 to 07:00);
   - focus blocks, weekly windows, and "never interrupt me during focus blocks";
   - the evening digest and the hour it arrives;
   - the time zone all of these are read in (your browser's, the first time).

   The line at the top says what is true right now ("held until 11:00, a focus block"). */

const HOURS = Array.from({ length: 24 }, (_, h) => {
  const v = `${String(h).padStart(2, "0")}:00`;
  return { value: String(h), label: clock(v) };
});
const PER_HOUR = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "1 an hour" : `${i + 1} an hour` }));

function prefsOf(v: ListeningPreferencesView): ListeningPreferences {
  return {
    interruptions_enabled: v.interruptions_enabled,
    max_per_hour: v.max_per_hour,
    quiet_start: v.quiet_start ?? null,
    quiet_end: v.quiet_end ?? null,
    focus_blocks: (v.focus_blocks ?? []).map((b) => ({ days: [...b.days], start: b.start, end: b.end, label: b.label ?? null })),
    never_during_focus: v.never_during_focus,
    digest_enabled: v.digest_enabled,
    digest_hour: v.digest_hour,
    time_zone: v.time_zone,
  };
}

function untilText(iso: string | null | undefined, zone: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function ListeningSettings({ initial, loaded }: { initial: ListeningPreferencesView; loaded: boolean }) {
  const router = useRouter();
  const ids = { on: useId(), per: useId(), quiet: useId(), focus: useId(), tz: useId(), digest: useId(), hour: useId(), qs: useId(), qe: useId() };
  const [view, setView] = useState(initial);
  const [saved, setSaved] = useState<ListeningPreferences>(() => prefsOf(initial));
  const [draft, setDraft] = useState<ListeningPreferences>(() => prefsOf(initial));
  const [zones, setZones] = useState<string[]>([initial.time_zone]);
  const [guessedZone, setGuessedZone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The zone list and the browser's zone are only known on the client, after mount.
  useEffect(() => {
    let list: string[] = [];
    try {
      list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    } catch {
      list = [];
    }
    const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setZones(Array.from(new Set(["UTC", initial.time_zone, mine, ...list])).filter(Boolean));
    if (initial.time_zone === "UTC" && mine && mine !== "UTC") {
      setDraft((d) => ({ ...d, time_zone: mine }));
      setGuessedZone(true);
    }
  }, [initial.time_zone]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const quietOn = draft.quiet_start !== null && draft.quiet_start !== undefined;
  const set = (patch: Partial<ListeningPreferences>) => {
    setError(null);
    setDraft((d) => ({ ...d, ...patch }));
  };
  const blocks = draft.focus_blocks ?? [];
  const setBlock = (i: number, patch: Partial<FocusBlock>) => set({ focus_blocks: blocks.map((b, k) => (k === i ? { ...b, ...patch } : b)) });

  const save = async (next: ListeningPreferences, isUndo = false) => {
    const bad = (next.focus_blocks ?? []).map(focusBlockError).find(Boolean);
    if (bad) return setError(bad);
    const before = saved;
    setBusy(true);
    const res = await saveListeningPreferences(next);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    const after = prefsOf(res.data);
    setView(res.data);
    setSaved(after);
    setDraft(after);
    setGuessedZone(false);
    router.refresh();
    if (isUndo) notifySuccess("Listening settings restored");
    else notifySuccess("Listening settings saved", { undo: () => void save(before, true) });
  };

  const zoneOptions = zones.map((z) => ({ value: z, label: z.replace(/_/g, " "), group: z.includes("/") ? z.split("/")[0] : "Other" }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save(draft);
      }}
      className="grid gap-5"
    >
      <SectionCard
        title="Interruptions"
        headingId="interruptions-h"
        headingLevel={3}
        description="While a meeting you are not in is live, your Myte listens for you and pulls you in only when something needs you."
      >
        <div className="px-4 py-4 sm:px-[22px]" aria-live="polite">
          {loaded ? (
            <Note tone={view.interruptible_now ? "info" : "warning"}>{rightNowLine(view, untilText(view.quiet_until, view.time_zone))}</Note>
          ) : (
            <Note tone="warning">We could not load your settings, so the defaults are shown. Saving writes what you see.</Note>
          )}
        </div>
        <InlineRow label="Let my Myte interrupt me" labelId={ids.on} help="Off: nothing interrupts you; what your Myte hears waits for your evening digest.">
          <Toggle labelledBy={ids.on} checked={draft.interruptions_enabled} onChange={(v) => set({ interruptions_enabled: v })} />
        </InlineRow>
        <FieldRow label="At most" htmlFor={ids.per} help="More than this in an hour is held for later, never lost.">
          <Dropdown
            id={ids.per}
            label="Interruptions an hour, at most"
            value={String(draft.max_per_hour)}
            onChange={(v) => set({ max_per_hour: Number(v) })}
            options={PER_HOUR}
            size="lg"
            disabled={!draft.interruptions_enabled}
          />
        </FieldRow>
        <InlineRow label="Quiet hours" labelId={ids.quiet} help="Every day. Overnight works, like 22:00 to 07:00.">
          <Toggle
            labelledBy={ids.quiet}
            checked={quietOn}
            onChange={(v) => set(v ? { quiet_start: "21:00", quiet_end: "08:00" } : { quiet_start: null, quiet_end: null })}
          />
        </InlineRow>
        {quietOn ? (
          <div className="flex flex-wrap items-end gap-3 px-4 py-4 sm:px-[22px]">
            <label htmlFor={ids.qs} className="grid gap-1.5 text-[14px] font-semibold text-ink-2">
              From
              <TextInput id={ids.qs} type="time" value={draft.quiet_start ?? ""} onChange={(e) => set({ quiet_start: e.target.value || null })} className="w-36" />
            </label>
            <label htmlFor={ids.qe} className="grid gap-1.5 text-[14px] font-semibold text-ink-2">
              Until
              <TextInput id={ids.qe} type="time" value={draft.quiet_end ?? ""} onChange={(e) => set({ quiet_end: e.target.value || null })} className="w-36" />
            </label>
          </div>
        ) : null}
        <InlineRow label="Never interrupt me during focus blocks" labelId={ids.focus} help="Anything in a focus block waits until it ends.">
          <Toggle labelledBy={ids.focus} checked={draft.never_during_focus} onChange={(v) => set({ never_during_focus: v })} />
        </InlineRow>
        <div className="px-4 py-4 sm:px-[22px]">
          <p className="text-[15px] font-semibold text-ink">Focus blocks</p>
          <p className="mt-0.5 text-[14px] text-ink-3">Weekly windows for deep work.</p>
          {blocks.length === 0 ? <p className="mt-3 text-[14px] text-ink-3">None yet.</p> : null}
          <ul className="mt-3 space-y-3">
            {blocks.map((b, i) => (
              <FocusBlockRow
                key={i}
                index={i}
                block={b}
                onChange={(patch) => setBlock(i, patch)}
                onRemove={() => set({ focus_blocks: blocks.filter((_, k) => k !== i) })}
              />
            ))}
          </ul>
          {blocks.length < 14 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => set({ focus_blocks: [...blocks, { days: [0, 1, 2, 3, 4], start: "09:00", end: "11:00", label: "Deep work" }] })}
            >
              <Plus size={15} weight="bold" aria-hidden />
              Add a focus block
            </Button>
          ) : null}
        </div>
        <FieldRow label="Time zone" htmlFor={ids.tz} help={guessedZone ? "Set from your browser. Save to keep it." : "Quiet hours, focus blocks and the digest follow it."}>
          <Dropdown id={ids.tz} label="Time zone" value={draft.time_zone} onChange={(v) => set({ time_zone: v })} options={zoneOptions} size="lg" />
        </FieldRow>
      </SectionCard>

      <SectionCard
        title="Evening digest"
        headingId="evening-digest-h"
        headingLevel={3}
        description="One paragraph each evening about every meeting your Myte listened to for you, with links to the moments. On Home and in your Inbox."
      >
        <InlineRow label="Send me the evening digest" labelId={ids.digest}>
          <Toggle labelledBy={ids.digest} checked={draft.digest_enabled} onChange={(v) => set({ digest_enabled: v })} />
        </InlineRow>
        <FieldRow label="Arrives at" htmlFor={ids.hour} help="In your time zone.">
          <Dropdown
            id={ids.hour}
            label="Evening digest arrives at"
            value={String(draft.digest_hour)}
            onChange={(v) => set({ digest_hour: Number(v) })}
            options={HOURS}
            size="lg"
            disabled={!draft.digest_enabled}
          />
        </FieldRow>
      </SectionCard>

      <div
        className={`sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-warm-2 sm:px-[22px] ${
          dirty || error ? "" : "hidden"
        }`}
      >
        <FieldMsg id="listening-save-msg" error={error} hint={dirty ? "You have changes that are not saved yet." : null} />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" disabled={busy || !dirty} onClick={() => setDraft(saved)}>
            Discard
          </Button>
          <Button type="submit" disabled={busy || !dirty} aria-busy={busy || undefined}>
            {busy ? "Saving" : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function FocusBlockRow({
  index,
  block,
  onChange,
  onRemove,
}: {
  index: number;
  block: FocusBlock;
  onChange: (patch: Partial<FocusBlock>) => void;
  onRemove: () => void;
}) {
  const uid = useId();
  const error = focusBlockError(block);
  return (
    <li className="rounded-ctl border border-line px-3.5 py-3">
      <fieldset aria-describedby={`${uid}-msg`}>
        <legend className="sr-only">Focus block {index + 1}</legend>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor={`${uid}-label`} className="grid min-w-[10rem] flex-1 gap-1.5 text-[13.5px] font-semibold text-ink-2">
            Name
            <TextInput id={`${uid}-label`} value={block.label ?? ""} maxLength={40} onChange={(e) => onChange({ label: e.target.value })} placeholder="Deep work" />
          </label>
          <label htmlFor={`${uid}-s`} className="grid gap-1.5 text-[13.5px] font-semibold text-ink-2">
            From
            <TextInput id={`${uid}-s`} type="time" className="w-32" value={block.start} onChange={(e) => onChange({ start: e.target.value })} />
          </label>
          <label htmlFor={`${uid}-e`} className="grid gap-1.5 text-[13.5px] font-semibold text-ink-2">
            Until
            <TextInput id={`${uid}-e`} type="time" className="w-32" value={block.end} onChange={(e) => onChange({ end: e.target.value })} />
          </label>
          <Button type="button" variant="ghost" size="sm" icon aria-label={`Remove focus block ${index + 1}`} onClick={onRemove}>
            <Trash size={15} aria-hidden />
          </Button>
        </div>
        <div role="group" aria-label="Days" className="mt-3 flex flex-wrap gap-1.5">
          {DAY_SHORT.map((d, i) => {
            const on = block.days.includes(i);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => onChange({ days: on ? block.days.filter((x) => x !== i) : [...block.days, i].sort((a, b) => a - b) })}
                className={`inline-flex h-9 min-w-[2.75rem] items-center justify-center rounded-full border px-3 text-[13.5px] font-semibold transition-colors ${
                  on ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:bg-surface-2"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        <FieldMsg id={`${uid}-msg`} error={error} hint={error ? null : focusBlockLabel(block)} />
      </fieldset>
    </li>
  );
}
