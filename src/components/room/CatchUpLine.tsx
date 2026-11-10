"use client";

import { useEffect, useId, useState } from "react";
import { ArrowCounterClockwise, CaretDown, CheckSquare, Gavel, X } from "@phosphor-icons/react";
import { loadCatchUp } from "@/components/room/stage-actions";
import type { CatchUpSummaryWire } from "@/lib/api/room-stage-types";
import { catchUpLine } from "@/lib/realtime/stage";

/* The late joiner's catch-up line (polish program, Phase 1, "Close-out ritual"): someone who joins
   after the call opened gets one quiet line under the agenda bar, "Since 0:00: 2 decisions, item 3
   in progress", read from core-api (`GET /meetings/{id}/catch-up-summary`: confirmed decisions and
   tasks, the item in progress), never from the socket. "Show" lists them in place; the line can
   be closed for this visit. Loading is a short placeholder, a failed read says so with Retry. */

export function CatchUpLine({
  meetingId,
  nameOf,
  onClose,
}: {
  meetingId: string;
  nameOf: (id: string) => string;
  onClose: () => void;
}) {
  const uid = useId();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "error" } | { kind: "ready"; summary: CatchUpSummaryWire }>({
    kind: "loading",
  });
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState({ kind: "loading" });
    void loadCatchUp(meetingId)
      .then((res) => {
        if (!live) return;
        setState(res.ok ? { kind: "ready", summary: res.summary } : { kind: "error" });
      })
      .catch(() => live && setState({ kind: "error" }));
    return () => {
      live = false;
    };
  }, [meetingId, attempt]);

  if (state.kind === "loading") {
    return (
      <div className="sb-catchup is-loading" aria-busy="true">
        <span className="sb-skel is-short" aria-hidden />
        <span className="sr-only">Loading what you missed</span>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="sb-catchup is-error" role="status">
        <p>Couldn&rsquo;t load what you missed.</p>
        <button type="button" className="sb-link tap" onClick={() => setAttempt((n) => n + 1)}>
          <ArrowCounterClockwise size={14} aria-hidden />
          Retry
        </button>
        <button type="button" className="sb-x tap" aria-label="Close the catch-up line" onClick={onClose}>
          <X size={14} aria-hidden />
        </button>
      </div>
    );
  }

  const s = state.summary;
  const line = catchUpLine({
    decisionCount: s.decision_count,
    actionCount: s.action_count,
    agendaDone: s.agenda_done,
    agendaTotal: s.agenda_total,
    current: s.current_item ? { number: s.current_item.position + 1, title: s.current_item.title } : null,
  });
  const hasList = s.decisions.length > 0 || s.actions.length > 0 || Boolean(s.current_item);

  return (
    <div className="sb-catchup" role="region" aria-label="What you missed">
      <div className="sb-catchup-row">
        <p className="sb-catchup-text">{line}</p>
        {hasList ? (
          <button
            type="button"
            className="sb-link tap"
            aria-expanded={open}
            aria-controls={`${uid}-list`}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "Hide" : "Show"}
            <CaretDown size={13} weight="bold" className={open ? "is-flipped" : undefined} aria-hidden />
          </button>
        ) : null}
        <button type="button" className="sb-x tap" aria-label="Close the catch-up line" onClick={onClose}>
          <X size={14} aria-hidden />
        </button>
      </div>
      <div id={`${uid}-list`} className="sb-catchup-list" hidden={!open}>
        {s.current_item ? (
          <p className="sb-catchup-now">
            Now on item {s.current_item.position + 1}: <strong>{s.current_item.title}</strong>
          </p>
        ) : null}
        {s.decisions.length > 0 ? (
          <>
            <h3 className="sb-catchup-h">
              <Gavel size={14} aria-hidden />
              Decided
            </h3>
            <ul>
              {s.decisions.map((d) => (
                <li key={d.id}>
                  {d.content}
                  {d.confirmed_by ? <span className="sb-catchup-meta">Confirmed by {nameOf(d.confirmed_by)}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {s.actions.length > 0 ? (
          <>
            <h3 className="sb-catchup-h">
              <CheckSquare size={14} aria-hidden />
              Tasks
            </h3>
            <ul>
              {s.actions.map((a) => (
                <li key={a.id}>
                  {a.content}
                  <span className="sb-catchup-meta">{a.assignee_id ? nameOf(a.assignee_id) : "No owner yet"}</span>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}
