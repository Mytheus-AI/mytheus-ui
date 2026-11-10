"use client";

/**
 * One Socket.io connection to `realtime-gateway`, joined to one meeting room, reduced into
 * caption state. Plan 3-4 §3.8 step 1, over the contract in §3.4 step 3.
 *
 * ONE SOCKET, EVER. This repo's CLAUDE.md is explicit ("Never open a second socket"), and the
 * gateway scales on anchor A6 = 100k concurrent connections, so a stray second connection per
 * client is not a tidiness issue but a doubling of the tier's headline cost driver. The socket
 * is created inside the effect and torn down by its cleanup, so a remount cannot leak one.
 *
 * DEGRADES BY DESIGN, exactly as `useLiveKitRoom` does and for the same reason:
 * `NEXT_PUBLIC_REALTIME_WS_URL` is unset in every environment that exists today, so this
 * reports `disabled`, opens nothing, and the caller keeps rendering its mock captions. That
 * keeps the room working today and makes this code reviewable now rather than after the
 * gateway is deployed somewhere reachable.
 *
 * RE-HYDRATES ON EVERY (RE)CONNECT. The gateway replays nothing to a reconnecting client, by
 * design - finals are durable and are meant to be re-read from `core-api`'s REST read model -
 * so without this a socket drop silently loses every caption spoken during it. On each
 * `connect`, and therefore on every automatic reconnect too, this re-reads the durable finals
 * through `/api/meeting-transcript` and merges them in. `applyCaption` is idempotent on
 * `chunkId`, so a final that arrives from both the hydrate and the socket renders once.
 *
 * Merged rather than replacing state: a naive `setCaptions(hydrate(...))` would discard any
 * caption that arrived between the fetch starting and finishing, which on a busy meeting is a
 * real window. Folding the fetched finals into whatever is current keeps both.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  applyCaption,
  emptyCaptionState,
  type CaptionPayload,
  type CaptionState,
} from "./captions";
import {
  applyNoteDelta,
  applyNoteFinal,
  emptyNotesState,
  hydrateNotes,
  type NoteDeltaPayload,
  type NoteFinalPayload,
  type NotesState,
} from "./notes";
import {
  applyLiveCandidates,
  emptyCandidatesState,
  hydrateCandidates,
  resolveCandidate as resolveCandidateIn,
  updateCandidate as updateCandidateIn,
  type Candidate,
  type CandidateEventPayload,
  type CandidateRow,
  type CandidatesState,
} from "./candidates";
import {
  applyLiveSuggestions,
  emptySuggestionsState,
  hydrateSuggestions,
  resolveSuggestion as resolveSuggestionIn,
  saveSuggestion as saveSuggestionIn,
  type SuggestionEventPayload,
  type SuggestionRow,
  type SuggestionsState,
} from "./suggestions";
import {
  applyLiveContextFill,
  dismissContextFill as dismissContextFillIn,
  emptyContextFillsState,
  hydrateContextFills,
  type ContextFillEventPayload,
  type ContextFillRow,
  type ContextFillsState,
} from "./contextFills";
import {
  applyLiveAlert,
  dismissAlert as dismissAlertIn,
  emptyAlertsState,
  hydrateAlerts,
  markAlertRead as markAlertReadIn,
  type AlertEventPayload,
  type AlertRow,
  type AlertsState,
} from "./alerts";
import {
  applyAgentAgenda,
  applyNudge,
  beginHostStatus,
  commitHostStatus,
  dismissNudge as dismissNudgeIn,
  hydrateAgenda,
  initialAgendaState,
  rollbackHostStatus,
  type AgendaState,
  type NudgeState,
  emptyNudgeState,
} from "./agenda";
import type { AgendaItem, AgendaStatus, AgentAgendaPayload, AgentNudgePayload } from "@/lib/api/meeting-agenda-types";

export type SocketStatus =
  | "disabled" // no NEXT_PUBLIC_REALTIME_WS_URL: caller falls back to mock captions
  | "connecting"
  | "joined"
  | "forbidden" // the participant check denied this user for this meeting
  | "error";

export interface MeetingSocketState {
  status: SocketStatus;
  captions: CaptionState;
  /** Internal `users.id` UUIDs currently in the room, per the gateway's presence contract. */
  presence: string[];
  /** This participant's own PersonalListener notes (Plan 7-9 §3.4): live drafts and finals. */
  notes: NotesState;
  /** The meeting's decision and action candidates awaiting Confirm (Plan 7-9 §3.8, ADR-0031). */
  candidates: CandidatesState;
  /** Drop a candidate this participant confirmed or dismissed. */
  resolveCandidate: (id: string, outcome: "confirmed" | "dismissed") => void;
  /** Apply an edit the server accepted. */
  updateCandidate: (
    id: string,
    patch: Partial<Pick<Candidate, "content" | "rationale" | "assigneeId" | "dueDate">>,
  ) => void;
  /** This participant's own QuestionAgent suggestions, open and saved (Plan 7-9 §3.10, ADR-0034). */
  suggestions: SuggestionsState;
  /** Drop a suggestion this participant asked or dismissed. */
  resolveSuggestion: (id: string, outcome: "asked" | "dismissed") => void;
  /** Move a suggestion the server saved into Saved for later. */
  markSuggestionSaved: (id: string) => void;
  /** This participant's own ContextGapAgent context fills (Phase P10, plan 3.5). */
  contextFills: ContextFillsState;
  /** Drop a context fill this participant dismissed (or that is gone on the server). */
  dismissContextFill: (id: string) => void;
  /** This participant's own ProactiveAgent alerts (Phase P11, plan 3.9). */
  alerts: AlertsState;
  /** Keep an alert the server marked read, quieter. */
  markAlertRead: (id: string) => void;
  /** Drop an alert this participant dismissed (or that is gone on the server), for good. */
  dismissAlert: (id: string) => void;
  /** The meeting's shared agenda (ADR-0038 D9), re-hydrated on every (re)connect. */
  agenda: AgendaState;
  /** The host's optimistic status change: begin, then commit or roll back with the same `op`. */
  agendaHost: {
    begin: (itemId: string, status: AgendaStatus, op: number) => void;
    commit: (itemId: string, op: number, row: AgendaItem | null) => void;
    rollback: (itemId: string, op: number) => void;
  };
  /** The MeetingAgent's nudges, host only and never replayed: one showing at a time. */
  nudges: NudgeState;
  dismissNudge: (id: string) => void;
}

interface JoinAck {
  ok: boolean;
  presence?: string[];
  error?: "FORBIDDEN" | "INVALID_PAYLOAD";
}

export function useMeetingSocket(
  meetingId: string,
  token: string | null,
  /** The agenda the page was rendered with, shown until the first re-hydrate answers. */
  initialAgenda?: AgendaItem[],
): MeetingSocketState {
  const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const [status, setStatus] = useState<SocketStatus>(url ? "connecting" : "disabled");
  const [captions, setCaptions] = useState<CaptionState>(emptyCaptionState);
  const [presence, setPresence] = useState<string[]>([]);
  const [notes, setNotes] = useState<NotesState>(emptyNotesState);
  const [candidates, setCandidates] = useState<CandidatesState>(emptyCandidatesState);
  const [suggestions, setSuggestions] = useState<SuggestionsState>(emptySuggestionsState);
  const [contextFills, setContextFills] = useState<ContextFillsState>(emptyContextFillsState);
  const [alerts, setAlerts] = useState<AlertsState>(emptyAlertsState);
  const [agenda, setAgenda] = useState<AgendaState>(() => initialAgendaState(initialAgenda ?? []));
  const [nudges, setNudges] = useState<NudgeState>(emptyNudgeState);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // No token means Clerk has not resolved a session yet. Connecting anonymously would just
    // be denied by the handshake, so wait rather than burn a connection attempt.
    if (!url || !token) return;

    let cancelled = false;
    // Namespace `/v1`, per the gateway's contract. The token rides `auth`, which is where
    // `server.ts` reads it from (`socket.handshake.auth.token`) - not a header, which the
    // WebSocket upgrade cannot carry portably anyway.
    const socket = io(`${url.replace(/\/+$/, "")}/v1`, {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const rehydrate = async () => {
      try {
        const response = await fetch(
          `/api/meeting-transcript?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { items?: CaptionPayload[] };
        if (cancelled || !body.items?.length) return;
        setCaptions((prev) =>
          body.items!.reduce((state, payload) => applyCaption(state, payload), prev),
        );
      } catch {
        // A failed re-hydrate must not break the live stream. The socket keeps delivering new
        // captions either way; the cost of failing here is only the gap during the disconnect,
        // which is exactly the state we were already in.
      }
    };

    // The same re-hydrate rule for My Notes: the gateway replays nothing, so every (re)connect
    // re-reads the durable notes and folds them in by window.
    const rehydrateNotes = async () => {
      try {
        const response = await fetch(
          `/api/meeting-worklogs?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { items?: NoteFinalPayload[] };
        if (cancelled || !body.items?.length) return;
        setNotes((prev) => hydrateNotes(prev, body.items!));
      } catch {
        // Same reasoning as captions: the live stream keeps working without it.
      }
    };

    // And for candidates: the meeting's still-proposed decisions and actions, merged by id.
    const rehydrateCandidates = async () => {
      try {
        const response = await fetch(
          `/api/meeting-candidates?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { decisions?: CandidateRow[]; actions?: CandidateRow[] };
        if (cancelled) return;
        setCandidates((prev) => hydrateCandidates(prev, body));
      } catch {
        // Same reasoning as captions: the live stream keeps working without it.
      }
    };

    // And for this participant's suggestions: this meeting's open ones plus the ones saved in
    // any meeting (ADR-0034 D8), merged by id. core-api decides whose they are from the session.
    const rehydrateSuggestions = async () => {
      try {
        const response = await fetch(
          `/api/meeting-suggestions?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { open?: SuggestionRow[]; saved?: SuggestionRow[] };
        if (cancelled) return;
        setSuggestions((prev) => hydrateSuggestions(prev, body));
      } catch {
        // Same reasoning as captions: the live stream keeps working without it.
      }
    };

    // And for this participant's context fills: their surfaced, non-dismissed fills for this
    // meeting, merged by id. A dismissed fill is remembered in the reducer and never returns.
    const rehydrateContextFills = async () => {
      try {
        const response = await fetch(
          `/api/meeting-context-fills?meeting_id=${encodeURIComponent(meetingId)}`,
        );
        if (!response.ok) return;
        const body = (await response.json()) as { items?: ContextFillRow[] };
        if (cancelled) return;
        setContextFills((prev) => hydrateContextFills(prev, body));
      } catch {
        // Same reasoning as captions: the live stream keeps working without it.
      }
    };

    // And for this participant's alerts: the gateway drains each alert to the socket once, so
    // every (re)connect re-reads their notification-service rows for this meeting. A dismissed
    // row is remembered in the reducer and never returns.
    const rehydrateAlerts = async () => {
      try {
        const response = await fetch(`/api/meeting-alerts?meeting_id=${encodeURIComponent(meetingId)}`);
        if (!response.ok) return;
        const body = (await response.json()) as { items?: AlertRow[] };
        if (cancelled) return;
        setAlerts((prev) => hydrateAlerts(prev, body));
      } catch {
        // Same reasoning as captions: the live stream keeps working without it.
      }
    };

    // And for the shared agenda (ADR-0038 D9): the gateway replays nothing, so every (re)connect
    // re-reads it from core-api. A failure keeps what is shown and marks it stale.
    const rehydrateAgenda = async () => {
      try {
        const response = await fetch(`/api/meeting-agenda?meeting_id=${encodeURIComponent(meetingId)}`);
        if (cancelled) return;
        if (!response.ok) {
          setAgenda((prev) => hydrateAgenda(prev, null));
          return;
        }
        const body = (await response.json()) as { items?: AgendaItem[] };
        if (cancelled) return;
        setAgenda((prev) => hydrateAgenda(prev, Array.isArray(body.items) ? body.items : null));
      } catch {
        if (!cancelled) setAgenda((prev) => hydrateAgenda(prev, null));
      }
    };

    const join = () => {
      void rehydrate();
      void rehydrateNotes();
      void rehydrateCandidates();
      void rehydrateSuggestions();
      void rehydrateContextFills();
      void rehydrateAlerts();
      void rehydrateAgenda();
      socket.emit("join", { meetingId }, (ack: JoinAck) => {
        if (cancelled) return;
        if (ack?.ok) {
          setStatus("joined");
          setPresence(ack.presence ?? []);
        } else {
          // The gateway always acks rather than throwing, so a denial is a value to render,
          // not an exception. Deny-by-default is the server's call and the UI states it.
          setStatus(ack?.error === "FORBIDDEN" ? "forbidden" : "error");
        }
      });
    };

    // Re-join on every (re)connect: Socket.io reconnects with a NEW socket id, and room
    // membership does not survive it.
    socket.on("connect", join);
    socket.on("connect_error", () => {
      if (!cancelled) setStatus("error");
    });

    socket.on("caption", (event: { meetingId: string; payload: CaptionPayload }) => {
      if (cancelled) return;
      // The gateway fans out per room, but a client that joined several meetings would receive
      // several streams on one socket; filtering by meetingId keeps this hook honest about
      // which meeting it represents.
      if (event?.meetingId !== meetingId || !event.payload) return;
      setCaptions((prev) => applyCaption(prev, event.payload));
    });

    // Private to this participant: the gateway emits these only to the note's owner.
    socket.on("agent-delta", (event: { meetingId: string; payload: NoteDeltaPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setNotes((prev) => applyNoteDelta(prev, event.payload));
    });
    socket.on("agent-note", (event: { meetingId: string; payload: NoteFinalPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setNotes((prev) => applyNoteFinal(prev, event.payload));
    });

    // Shared with the whole meeting: a decision or action belongs to the meeting, not to one
    // participant (ADR-0031 D4). Only surfaced candidates are forwarded.
    socket.on("agent-candidate", (event: { meetingId: string; payload: CandidateEventPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setCandidates((prev) => applyLiveCandidates(prev, event.payload));
    });

    // Private to this participant, like notes: the gateway emits a suggestion only to its owner's
    // sockets (ADR-0034 D6).
    socket.on("agent-suggestion", (event: { meetingId: string; payload: SuggestionEventPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setSuggestions((prev) => applyLiveSuggestions(prev, event.payload));
    });

    // Private to the requester, like suggestions: the gateway emits a fill only to their sockets,
    // and only when it is surfaced (P10 contract section 7).
    socket.on("agent-context", (event: { meetingId: string; payload: ContextFillEventPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setContextFills((prev) => applyLiveContextFill(prev, event.payload));
    });

    // Private to the recipient, drained from their priority queue most urgent first (P11
    // contract section 4). Only an alert about THIS meeting is shown: the re-hydrate above is
    // meeting-scoped, so an alert about another meeting would vanish on reload. The gateway only
    // delivers an alert into its own meeting's room; the reducer checks it again.
    socket.on("agent-alert", (event: { meetingId: string; payload: AlertEventPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setAlerts((prev) => applyLiveAlert(prev, event.payload, meetingId));
    });

    // Shared with the whole meeting (ADR-0038 D9): the MeetingAgent's agenda updates. The reducer
    // applies core-api's rules (the host wins, never back from covered).
    socket.on("agent-agenda", (event: { meetingId: string; payload: AgentAgendaPayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setAgenda((prev) => applyAgentAgenda(prev, event.payload));
    });

    // Private to the host: the gateway sends a nudge only to the host's sockets, and never
    // replays it, so it lives only in this tab's state.
    socket.on("agent-nudge", (event: { meetingId: string; payload: AgentNudgePayload }) => {
      if (cancelled || event?.meetingId !== meetingId || !event.payload) return;
      setNudges((prev) => applyNudge(prev, event.payload));
    });

    socket.on("presence", (members: string[]) => {
      if (!cancelled) setPresence(Array.isArray(members) ? members : []);
    });

    return () => {
      cancelled = true;
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [url, token, meetingId]);

  const resolveCandidate = useCallback(
    (id: string, outcome: "confirmed" | "dismissed") =>
      setCandidates((prev) => resolveCandidateIn(prev, id, outcome)),
    [],
  );
  const updateCandidate = useCallback(
    (id: string, patch: Partial<Pick<Candidate, "content" | "rationale" | "assigneeId" | "dueDate">>) =>
      setCandidates((prev) => updateCandidateIn(prev, id, patch)),
    [],
  );

  const resolveSuggestion = useCallback(
    (id: string, outcome: "asked" | "dismissed") =>
      setSuggestions((prev) => resolveSuggestionIn(prev, id, outcome)),
    [],
  );
  const markSuggestionSaved = useCallback(
    (id: string) => setSuggestions((prev) => saveSuggestionIn(prev, id)),
    [],
  );

  const dismissContextFill = useCallback(
    (id: string) => setContextFills((prev) => dismissContextFillIn(prev, id)),
    [],
  );

  const agendaHost = useMemo(
    () => ({
      begin: (itemId: string, status: AgendaStatus, op: number) =>
        setAgenda((prev) => beginHostStatus(prev, itemId, status, op)),
      commit: (itemId: string, op: number, row: AgendaItem | null) =>
        setAgenda((prev) => commitHostStatus(prev, itemId, op, row)),
      rollback: (itemId: string, op: number) => setAgenda((prev) => rollbackHostStatus(prev, itemId, op)),
    }),
    [],
  );
  const dismissNudge = useCallback((id: string) => setNudges((prev) => dismissNudgeIn(prev, id)), []);

  const markAlertRead = useCallback((id: string) => setAlerts((prev) => markAlertReadIn(prev, id)), []);
  const dismissAlert = useCallback((id: string) => setAlerts((prev) => dismissAlertIn(prev, id)), []);

  return useMemo(
    () => ({
      status,
      captions,
      presence,
      notes,
      candidates,
      resolveCandidate,
      updateCandidate,
      suggestions,
      resolveSuggestion,
      markSuggestionSaved,
      contextFills,
      dismissContextFill,
      alerts,
      markAlertRead,
      dismissAlert,
      agenda,
      agendaHost,
      nudges,
      dismissNudge,
    }),
    [
      agenda,
      agendaHost,
      nudges,
      dismissNudge,
      status,
      captions,
      presence,
      notes,
      candidates,
      resolveCandidate,
      updateCandidate,
      suggestions,
      resolveSuggestion,
      markSuggestionSaved,
      contextFills,
      dismissContextFill,
      alerts,
      markAlertRead,
      dismissAlert,
    ],
  );
}
