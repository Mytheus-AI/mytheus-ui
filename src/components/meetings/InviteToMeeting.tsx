"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "@phosphor-icons/react";
import { inviteToMeeting } from "@/app/actions/meetings";
import { MemberPicker, type PickableMember } from "./MemberPicker";

/* "Invite people" on a meeting's page: pick workspace members not yet in it. The server only
   lets someone already in the meeting invite, and keeps invitees inside the workspace. */

export function InviteToMeeting({
  meetingId,
  members,
}: {
  meetingId: string;
  /** Workspace members not yet in this meeting; null when the list could not be loaded. */
  members: PickableMember[] | null;
}) {
  const router = useRouter();
  const ids = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    openerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("input, button[role='checkbox'], a")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const send = async () => {
    if (selected.length === 0) return setError("Pick at least one person.");
    setBusy(true);
    setError(null);
    const result = await inviteToMeeting(meetingId, selected);
    setBusy(false);
    if (!result.ok) return setError(result.message);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className="btn-ghost-sm tap mh-invite-open"
        onClick={() => {
          setSelected([]);
          setError(null);
          setOpen(true);
        }}
      >
        <UserPlus size={14} weight="bold" aria-hidden="true" />
        Invite people
      </button>

      {open && (
        <div className="mh-new-layer">
          <button type="button" className="mh-new-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${ids}-h`} className="mh-new">
            <div className="mh-new-head">
              <h2 id={`${ids}-h`}>Invite people</h2>
              <button type="button" className="mh-new-x tap" aria-label="Close" onClick={close}>
                <X size={16} weight="bold" aria-hidden="true" />
              </button>
            </div>
            <div className="mh-new-body">
              <MemberPicker
                members={members}
                selected={selected}
                onChange={setSelected}
                emptyHint="Everyone in this workspace is already invited."
              />
              {error && (
                <p className="mh-new-error" role="alert">
                  {error}
                </p>
              )}
              <div className="mh-new-acts">
                <button type="button" className="btn-ghost-sm tap" onClick={close} disabled={busy}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-accent-sm tap"
                  onClick={send}
                  disabled={busy || !members || members.length === 0}
                >
                  {busy ? "Inviting…" : selected.length > 1 ? `Invite ${selected.length} people` : "Invite"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
