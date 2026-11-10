"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowClockwise, EyeSlash, Microphone, ShieldCheck, X } from "@phosphor-icons/react";
import { RoomDialog } from "@/components/room/RoomDialog";
import { ConsentTerms } from "@/components/call/consent";
import { ConsentReceiptView } from "@/components/call/ConsentReceipt";
import { loadConsentReceipt, type ConsentReceiptRow } from "@/app/actions/off-record";
import { sinceLabel, type OffRecordRequests, type OffRecordState } from "@/lib/realtime/privacy";

/* Off the record in the room (polish program wave 3).

   - `OffRecordBanner`: the room-wide state while a segment runs, for everyone: "Off the record
     since 12:04. Agents are paused and nothing is transcribed." The host (or creator) ends it here.
   - `OffRecordAsks`: for the host, who asked to go off the record, with Go off the record (grants
     it, naming them) and Not now (tells the room).
   - `WhatIsRecorded`: your own consent receipt and what the meeting keeps, from the More menu.

   THE RULE, as core-api enforces it: the host or the meeting's creator takes the meeting off the
   record and back; anyone else asks. The buttons only appear for the people the server lets act. */

export function OffRecordBanner({
  state,
  steers,
  nameOf,
  busy,
  onEnd,
}: {
  state: OffRecordState;
  steers: boolean;
  nameOf: (id: string) => string;
  busy: boolean;
  onEnd: () => void;
}) {
  if (!state.active) return null;
  const since = sinceLabel(state.since);
  const by = state.startedBy ? nameOf(state.startedBy) : null;
  const asked = state.requestedBy ? nameOf(state.requestedBy) : null;
  return (
    <div className="offrec-banner" role="status" aria-live="polite">
      <span className="offrec-ico" aria-hidden="true">
        <EyeSlash size={18} weight="bold" />
      </span>
      <div className="offrec-copy">
        <strong>{since ? `Off the record since ${since}` : "Off the record"}</strong>
        <span>
          Agents are paused and nothing is transcribed or kept.
          {by ? ` ${by === "You" ? "You" : by} took the meeting off the record${asked ? ` when ${asked === "You" ? "you" : asked} asked` : ""}.` : ""}
        </span>
      </div>
      {steers ? (
        <button type="button" className="offrec-btn tap" onClick={onEnd} disabled={busy} aria-busy={busy}>
          <Microphone size={16} aria-hidden />
          {busy ? "Resuming" : "Back on the record"}
        </button>
      ) : null}
    </div>
  );
}

export function OffRecordAsks({
  requests,
  nameOf,
  busy,
  onGrant,
  onDecline,
}: {
  requests: OffRecordRequests;
  nameOf: (id: string) => string;
  busy: boolean;
  onGrant: (userId: string) => void;
  onDecline: (userId: string) => void;
}) {
  const ask = requests[requests.length - 1];
  if (!ask) return null;
  const others = requests.length - 1;
  const name = nameOf(ask.userId);
  return (
    <div className="offrec-ask" role="alert">
      <span className="offrec-ico" aria-hidden="true">
        <EyeSlash size={18} />
      </span>
      <p>
        <strong>{name}</strong> asks to go off the record
        {others > 0 ? ` (and ${others} more ${others === 1 ? "person" : "people"})` : ""}. Agents pause and nothing is
        transcribed until you go back on the record.
      </p>
      <div className="offrec-ask-acts">
        <button type="button" className="offrec-btn tap" onClick={() => onGrant(ask.userId)} disabled={busy} aria-busy={busy}>
          <EyeSlash size={16} aria-hidden />
          Go off the record
        </button>
        <button type="button" className="sb-btn tap" onClick={() => onDecline(ask.userId)} disabled={busy}>
          Not now
        </button>
      </div>
    </div>
  );
}

type ReceiptLoad = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; receipt: ConsentReceiptRow };

export function WhatIsRecorded({
  open,
  onClose,
  meetingId,
  offRecord,
  recording,
}: {
  open: boolean;
  onClose: () => void;
  meetingId: string;
  offRecord: OffRecordState;
  recording: boolean | null;
}) {
  const [load, setLoad] = useState<ReceiptLoad>({ state: "loading" });
  const fetchReceipt = useCallback(() => {
    setLoad({ state: "loading" });
    void loadConsentReceipt(meetingId)
      .then((res) => setLoad(res.ok ? { state: "ready", receipt: res.receipt } : { state: "error", message: res.message }))
      .catch(() => setLoad({ state: "error", message: "Couldn't load your receipt just now." }));
  }, [meetingId]);
  useEffect(() => {
    if (open) fetchReceipt();
  }, [open, fetchReceipt]);

  return (
    <RoomDialog open={open} onClose={onClose} title="What is recorded">
      <div className="offrec-dialog">
        <p className={`offrec-now${offRecord.active ? " is-off" : ""}`}>
          {offRecord.active ? <EyeSlash size={16} aria-hidden /> : <ShieldCheck size={16} aria-hidden />}
          {offRecord.active
            ? "Right now the meeting is off the record: nothing is transcribed or kept, and agents are paused."
            : "Right now the meeting is on the record. Anyone can ask the host to go off the record."}
        </p>
        <h3 className="offrec-h">Your receipt</h3>
        {load.state === "loading" ? (
          <div className="offrec-skel" aria-busy="true" aria-label="Loading your receipt">
            <span />
            <span />
            <span />
          </div>
        ) : load.state === "error" ? (
          <div className="offrec-error" role="alert">
            <p>{load.message}</p>
            <button type="button" className="sb-btn tap" onClick={fetchReceipt}>
              <ArrowClockwise size={14} aria-hidden />
              Try again
            </button>
          </div>
        ) : (
          <ConsentReceiptView receipt={load.receipt} fallback={<ConsentTerms recording={load.receipt.recording ?? recording} />} />
        )}
        <div className="room-dialog-acts">
          <Link href={`/meetings/${meetingId}/record`} className="sb-btn tap" target="_blank" rel="noopener">
            Open the full record
          </Link>
          <button type="button" className="offrec-btn tap" onClick={onClose} autoFocus>
            <X size={14} aria-hidden />
            Close
          </button>
        </div>
      </div>
    </RoomDialog>
  );
}
