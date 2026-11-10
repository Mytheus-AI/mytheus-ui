"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash, User, VideoCamera } from "@phosphor-icons/react";
import { eraseData } from "@/app/actions/tenant-admin";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { MemberPicker, type MemberOption } from "@/components/ui/MemberPicker";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import { confirmMatches, confirmPhrase, type ErasureKind } from "@/lib/erasure";

/* Start erasure: choose a person or a meeting, read exactly what goes and what stays, then type
   the person's email (or the meeting's title) to turn the Erase button on. The server checks the
   same words again, so the typed confirmation is not only a client courtesy.

   Erasure cannot be undone, so there is no Undo: the dialog is the only gate, and the button
   names what it does ("Erase Priya's data"). A refused request (wrong words, a live meeting,
   your own data) changes nothing and says why in the dialog. */

export type ErasableMeeting = { id: string; title: string | null; when: string | null; live: boolean };

const WHAT: Record<ErasureKind, { goes: string[]; stays: string[] }> = {
  person: {
    goes: [
      "Their notes, promises and agent questions",
      "Their in-meeting chat and the updates asked of them",
      "Who they were in transcripts (lines they spoke become an unnamed speaker)",
      "Their personal access tokens and the share links they made",
    ],
    stays: ["Confirmed decisions and tasks, with their name removed", "Their membership: remove them in Members if they are leaving"],
  },
  meeting: {
    goes: [
      "Its notes, promises, chat and agent questions; nobody can open its transcript again",
      "Its speaker list, agenda and follow-up settings, guest addresses included",
      "Decisions and actions nobody confirmed",
      "Its share links. The meeting disappears from every list",
    ],
    stays: ["Confirmed decisions and tasks: they are the workspace's record"],
  },
};

export function ErasureFlow({ members, meetings }: { members: MemberOption[] | null; meetings: ErasableMeeting[] | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger-outline" size="sm" onClick={() => setOpen(true)}>
        <Trash size={16} aria-hidden />
        Start erasure
      </Button>
      <ErasureDialog open={open} onClose={() => setOpen(false)} members={members} meetings={meetings} />
    </>
  );
}

function ErasureDialog({
  open,
  onClose,
  members,
  meetings,
}: {
  open: boolean;
  onClose: () => void;
  members: MemberOption[] | null;
  meetings: ErasableMeeting[] | null;
}) {
  const uid = useId();
  const router = useRouter();
  const [kind, setKind] = useState<ErasureKind>("person");
  const [personId, setPersonId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const others = (members ?? []).filter((m) => !m.isYou);
  const person = others.find((m) => m.id === personId) ?? null;
  const meeting = (meetings ?? []).find((m) => m.id === meetingId) ?? null;
  const target = kind === "person" ? person : meeting;
  const phrase = kind === "person" ? (person ? confirmPhrase("person", { email: person.email }) : "") : meeting ? confirmPhrase("meeting", { title: meeting.title }) : "";
  const matches = !!target && confirmMatches(typed, phrase);
  const name = kind === "person" ? (person ? person.name.split(" ")[0] : "") : "";
  const verb = kind === "person" ? (person ? `Erase ${name}'s data` : "Erase their data") : "Erase meeting data";

  const reset = () => {
    setKind("person");
    setPersonId(null);
    setMeetingId("");
    setTyped("");
    setError(null);
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const switchKind = (k: ErasureKind) => {
    setKind(k);
    setTyped("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target || !matches || busy) return;
    if (kind === "meeting" && meeting?.live) {
      setError("The meeting is live. End it, then erase its data.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await eraseData({ kind, targetId: target.id, confirm: typed });
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    notifySuccess(kind === "person" ? `${person?.name ?? "Their"} data erased` : "Meeting data erased", { description: `${res.summary}.` });
    reset();
    onClose();
    router.refresh();
  };

  const what = WHAT[kind];

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={busy}
      tone="danger"
      size="lg"
      title="Erase data"
      description="Removes data from every Mytheus store and writes the request to the audit log. This cannot be undone."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-[14px] font-semibold text-ink">What to erase</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["person", "One person's data", "Everything personal, across all meetings", User],
                ["meeting", "One meeting's data", "Its transcript and everything said in it", VideoCamera],
              ] as const
            ).map(([k, label, help, Glyph]) => (
              <label
                key={k}
                className={`flex cursor-pointer items-start gap-3 rounded-ctl border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                  kind === k ? "border-priority-high bg-surface-2 shadow-[0_0_0_1px_var(--priority-high)]" : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
                }`}
              >
                <input type="radio" name={`${uid}-kind`} value={k} checked={kind === k} onChange={(e) => {
                    // A click on the card's text checks the radio without moving focus; move it, so
                    // the focus ring never sits on the card that is not chosen.
                    e.currentTarget.focus();
                    switchKind(k);
                  }}
                  className="sr-only"
                />
                <Glyph size={18} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{label}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-3">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === "person" ? (
          <div>
            <span id={`${uid}-person-label`} className="mb-1.5 block text-[14px] font-semibold text-ink">
              Person
            </span>
            {members === null ? (
              <Note tone="warning">The member list could not be loaded, so nobody can be picked just now.</Note>
            ) : others.length === 0 ? (
              <Note>Nobody else is in this workspace. You cannot erase your own data from the console.</Note>
            ) : (
              <MemberPicker
                id={`${uid}-person`}
                members={others}
                value={personId}
                onChange={(id) => {
                  setPersonId(id);
                  setTyped("");
                  setError(null);
                }}
                label="Person whose data to erase"
                placeholder="Pick a person"
              />
            )}
          </div>
        ) : (
          <div>
            <label htmlFor={`${uid}-meeting`} className="mb-1.5 block text-[14px] font-semibold text-ink">
              Meeting
            </label>
            {meetings === null ? (
              <Note tone="warning">Meetings could not be loaded, so none can be picked just now.</Note>
            ) : meetings.length === 0 ? (
              <Note>There are no meetings to erase.</Note>
            ) : (
              <select
                id={`${uid}-meeting`}
                value={meetingId}
                onChange={(e) => {
                  setMeetingId(e.target.value);
                  setTyped("");
                  setError(null);
                }}
                className={fieldClass}
              >
                <option value="">Pick a meeting</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {(m.title?.trim() || "Untitled meeting") + (m.when ? `, ${m.when}` : "") + (m.live ? " (live)" : "")}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div className="grid gap-4 rounded-card border border-line bg-surface-2 p-4 sm:grid-cols-2">
          <div>
            <h3 className="text-[14px] font-semibold text-priority-high">Erased</h3>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[14px] leading-snug text-ink-2">
              {what.goes.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-ink">Kept</h3>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[14px] leading-snug text-ink-2">
              {what.stays.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </div>

        {target ? (
          <div>
            <label htmlFor={`${uid}-confirm`} className="mb-1.5 block text-[14px] font-semibold text-ink">
              Type <span className="select-all break-all rounded-[6px] bg-bg-2 px-1.5 py-0.5 font-mono text-[13px] text-ink">{phrase}</span> to confirm
            </label>
            <input
              id={`${uid}-confirm`}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                if (error) setError(null);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${uid}-msg`}
              className={fieldClass}
            />
            <FieldMsg id={`${uid}-msg`} error={error} hint={!error && typed && !matches ? "Keep typing: it has to match exactly, apart from capitals." : null} />
          </div>
        ) : error ? (
          <FieldMsg id={`${uid}-msg`} error={error} />
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!matches || busy} aria-busy={busy}>
            <Trash size={16} aria-hidden />
            {busy ? "Erasing data" : verb}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
