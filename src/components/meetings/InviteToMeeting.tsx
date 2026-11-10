"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, X } from "@phosphor-icons/react";
import { inviteToMeeting } from "@/app/actions/meetings";
import { MemberPicker, type PickableMember } from "./MemberPicker";
import { useDialogKeys } from "./useDialogKeys";

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

  useDialogKeys(dialogRef, open, close, () =>
    dialogRef.current?.querySelector<HTMLElement>("input, button[role='checkbox'], a")?.focus(),
  );

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
        className="mx-btn is-outline tap"
        onClick={() => {
          setSelected([]);
          setError(null);
          setOpen(true);
        }}
      >
        <UserPlus size={18} weight="bold" aria-hidden="true" />
        Invite people
      </button>

      {open && (
        <div className="mh-new-layer">
          <button type="button" className="mh-new-scrim" aria-label="Close" onClick={close} tabIndex={-1} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={`${ids}-h`} className="mh-new">
            <div className="mh-new-head">
              <h2 id={`${ids}-h`}>Invite people</h2>
              <button type="button" className="cx-icon-btn sm tap" aria-label="Close" onClick={close}>
                <X size={18} weight="bold" aria-hidden="true" />
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
            </div>
            <div className="mh-new-acts">
              <button type="button" className="mx-btn is-outline tap" onClick={close} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="mx-btn tap"
                onClick={send}
                disabled={busy || !members || members.length === 0}
              >
                {busy ? "Inviting..." : selected.length > 1 ? `Invite ${selected.length} people` : "Invite"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
