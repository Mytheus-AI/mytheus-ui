"use client";

/**
 * One Socket.io connection to `realtime-gateway`, joined to one meeting room, reduced into the
 * room's live state. Plan 3-4 §3.8 step 1, over the contract in §3.4 step 3.
 *
 * ONE SOCKET, EVER. The gateway scales on anchor A6 = 100k concurrent connections, so a stray
 * second connection per client doubles the tier's headline cost driver. The socket is created
 * inside the effect and torn down by its cleanup, so a remount cannot leak one.
 *
 * A FRESH TOKEN ON EVERY (RE)CONNECT (polish program, Phase 0). The gateway verifies the Clerk
 * session token, including its expiry, at the handshake. That token lives about a minute, and it
 * used to be fetched once and passed as static auth, so any reconnect after a minute was rejected
 * and captions and the agent stopped while "Listening" stayed on. Now `auth` is a callback that
 * asks Clerk for a current token on every connect attempt, and `reauth` keeps the token the
 * gateway uses for its own core-api calls (chat persistence, ledger verification) current while
 * the socket stays up. A rejected handshake is retried with backoff and, after
 * `MAX_RECONNECT_ATTEMPTS`, the room says so and offers "Try again" instead of going quiet.
 *
 * RE-JOINS AND RE-HYDRATES ON EVERY (RE)CONNECT. The gateway replays nothing to a reconnecting
 * client by design; durable state is re-read from core-api and merged in (captions, notes, the
 * candidate ledger, suggestions, context fills, alerts, the agenda, chat). Merging rather than
 * replacing keeps whatever arrived while the fetch was in flight.
 *
 * DEGRADES BY DESIGN: without `NEXT_PUBLIC_REALTIME_WS_URL` this reports `disabled` and opens
 * nothing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { applyCaption, emptyCaptionState, type CaptionPayload, type CaptionState } from "./captions";
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
  applyLock,
  applyResolution,
  applyRoomLocks,
  emptyCandidatesState,
  expireSettled,
  hideCandidate as hideCandidateIn,
  hydrateCandidates,
  restoreHidden,
  settleLocally,
  updateCandidate as updateCandidateIn,
  type Candidate,
  type CandidateEventPayload,
  type CandidateOutcome,
  type CandidatesState,
  type LockPayload,
  type ResolutionPayload,
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
  applyHostAgendaRows,
  applyNudge,
  applyServerRows,
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
import {
  ackOwnMessage,
  addOwnMessage,
  applyChatSaved,
  applyLiveChat,
  emptyChatState,
  hydrateChat,
  markChatSeen as markChatSeenIn,
  type ChatState,
  type LiveChatPayload,
} from "./chat";
import {
  applyHand,
  applyReaction,
  applyRoomHands,
  emptyHandsState,
  expireReactions,
  type FloatingReaction,
  type HandsState,
  type ReactionId,
} from "./room-live";
import { MAX_RECONNECT_ATTEMPTS, backoffMs, type LiveLink } from "./connection";
import { applyWrapUp, initialWrapUp, type WrapUpState } from "./stage";
import { loadCandidateLedger, loadChatHistory } from "@/components/room/actions";
import type { AgendaItem, AgendaStatus, AgentAgendaPayload, AgentNudgePayload } from "@/lib/api/meeting-agenda-types";

export type SocketStatus = LiveLink;

/** What the gateway answers to a room event (see mytheus-realtime `roomEvents.ts`). */
export type RoomAck = { ok: true; [k: string]: unknown } | { ok: false; error: string; [k: string]: unknown };

export interface MeetingEnded {
  byUserId: string;
  at: string;
}

export interface MeetingSocketState {
  status: SocketStatus;
  /** This socket has been joined at least once (a later drop is a reconnect, not a first connect). */
  everJoined: boolean;
  /** Start over after the room gave up reconnecting. */
  retry: () => void;
  captions: CaptionState;
  /** Internal `users.id` UUIDs currently in the room, per the gateway's presence contract. */
  presence: string[];
  notes: NotesState;
  /** The meeting's shared candidate ledger (ADR-0031, polish program Phase 0). */
  candidates: CandidatesState;
  /** Tell the room a card was confirmed, edited or (host) dismissed after core-api accepted it. */
  announceCandidate: (id: string, outcome: CandidateOutcome) => Promise<RoomAck>;
  /** Settle a card on this screen at once (the room echo follows). */
  settleCandidate: (id: string, outcome: "confirmed" | "dismissed", by?: string | null) => void;
  /** Apply an edit the server accepted. */
  updateCandidate: (
    id: string,
    patch: Partial<Pick<Candidate, "content" | "rationale" | "assigneeId" | "dueDate">>,
  ) => void;
  /** "Hide for me": personal, remembered for this meeting in this browser. */
  hideCandidate: (id: string) => void;
  /** Take or release the edit lock on a card. */
  lockCandidate: (id: string, locked: boolean) => Promise<RoomAck>;
  suggestions: SuggestionsState;
  resolveSuggestion: (id: string, outcome: "asked" | "dismissed") => void;
  markSuggestionSaved: (id: string) => void;
  contextFills: ContextFillsState;
  dismissContextFill: (id: string) => void;
  alerts: AlertsState;
  markAlertRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  agenda: AgendaState;
  agendaHost: {
    begin: (itemId: string, status: AgendaStatus, op: number) => void;
    commit: (itemId: string, op: number, row: AgendaItem | null) => void;
    rollback: (itemId: string, op: number) => void;
    /** After core-api stored the host's change: tell everyone in the room. */
    announce: (itemId: string) => Promise<RoomAck>;
    /** Apply rows core-api returned for the host's own write (Start next, Extend). */
    applyRows: (rows: AgendaItem[]) => void;
    /** After core-api stored a change to several items ("Start next"): tell everyone. */
    announceMany: (itemIds: string[]) => Promise<RoomAck>;
  };
  nudges: NudgeState;
  dismissNudge: (id: string) => void;
  chat: ChatState;
  sendChat: (content: string) => void;
  markChatSeen: () => void;
  hands: HandsState;
  setHand: (raised: boolean) => Promise<RoomAck>;
  reactions: FloatingReaction[];
  react: (reaction: ReactionId) => Promise<RoomAck>;
  /** The host ended the meeting for everyone. */
  ended: MeetingEnded | null;
  announceEnd: () => Promise<RoomAck>;
  /** The host's 60-second close-out wrap-up, open with its shared deadline, or null. */
  wrapUp: WrapUpState | null;
  /** Set it on this screen at once (the host's own start or cancel; the room echo follows). */
  setWrapUp: (next: WrapUpState | null) => void;
  /** After core-api stored the host's start or cancel: tell everyone in the room. */
  announceWrapUp: () => Promise<RoomAck>;
}

interface JoinAck {
  ok: boolean;
  presence?: string[];
  error?: "FORBIDDEN" | "INVALID_PAYLOAD";
}

const REAUTH_MS = 40_000;
const ACK_TIMEOUT_MS = 6000;
const NOT_CONNECTED: RoomAck = { ok: false, error: "NOT_CONNECTED" };

function hiddenKey(meetingId: string): string {
  return `mytheus.hidden-cards.${meetingId}`;
}

function readHidden(meetingId: string): string[] {
  try {
    const raw = localStorage.getItem(hiddenKey(meetingId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function clientId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function useMeetingSocket(
  meetingId: string,
  options: {
    /** A current Clerk session token; called on every connect attempt and every reauth. */
    getToken: () => Promise<string | null>;
    /** Your internal user id, for telling your own chat and locks from others'. */
    meId: string | null;
    /** The agenda the page was rendered with, shown until the first re-hydrate answers. */
    initialAgenda?: AgendaItem[];
    /** The wrap-up start the page was rendered with (a reload mid-wrap-up keeps counting). */
    initialWrapUpStartedAt?: string | null;
  },
): MeetingSocketState {
  const url = process.env.NEXT_PUBLIC_REALTIME_WS_URL;
  const { meId } = options;
  const getTokenRef = useRef(options.getToken);
  getTokenRef.current = options.getToken;
  const meRef = useRef(meId);
  meRef.current = meId;

  const [status, setStatus] = useState<SocketStatus>(url ? "connecting" : "disabled");
  const [everJoined, setEverJoined] = useState(false);
  const [captions, setCaptions] = useState<CaptionState>(emptyCaptionState);
  const [presence, setPresence] = useState<string[]>([]);
  const [notes, setNotes] = useState<NotesState>(emptyNotesState);
  const [candidates, setCandidates] = useState<CandidatesState>(emptyCandidatesState);
  const [suggestions, setSuggestions] = useState<SuggestionsState>(emptySuggestionsState);
  const [contextFills, setContextFills] = useState<ContextFillsState>(emptyContextFillsState);
  const [alerts, setAlerts] = useState<AlertsState>(emptyAlertsState);
  const [agenda, setAgenda] = useState<AgendaState>(() => initialAgendaState(options.initialAgenda ?? []));
  const [nudges, setNudges] = useState<NudgeState>(emptyNudgeState);
  const [chat, setChat] = useState<ChatState>(emptyChatState);
  const [hands, setHands] = useState<HandsState>(emptyHandsState);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [ended, setEnded] = useState<MeetingEnded | null>(null);
  const [wrapUp, setWrapUp] = useState<WrapUpState | null>(() => initialWrapUp(options.initialWrapUpStartedAt));
  const [generation, setGeneration] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const joinedRef = useRef(false);

  // "Hide for me" is remembered for this meeting in this browser.
  useEffect(() => {
    const ids = readHidden(meetingId);
    if (ids.length) setCandidates((prev) => restoreHidden(prev, ids));
  }, [meetingId]);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let attempts = 0;
    let retryTimer: number | undefined;
    let reauthTimer: number | undefined;
    let chatLoaded = false;

    // `auth` as a callback: Socket.io calls it before EVERY connection attempt, the automatic
    // reconnects included, so each handshake carries a token Clerk minted just now.
    const socket = io(`${url.replace(/\/+$/, "")}/v1`, {
      auth: (cb) => {
        getTokenRef
          .current()
          .then((token) => cb({ token: token ?? "" }))
          .catch(() => cb({ token: "" }));
      },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30_000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    const read = async <T,>(path: string): Promise<T | null> => {
      try {
        const response = await fetch(`${path}${path.includes("?") ? "&" : "?"}meeting_id=${encodeURIComponent(meetingId)}`);
        if (!response.ok) return null;
        return (await response.json()) as T;
      } catch {
        return null;
      }
    };

    // Every re-hydrate degrades on its own: a failed read must never break the live stream.
    const rehydrate = () => {
      void read<{ items?: CaptionPayload[] }>("/api/meeting-transcript").then((body) => {
        if (cancelled || !body?.items?.length) return;
        setCaptions((prev) => body.items!.reduce((state, payload) => applyCaption(state, payload), prev));
      });
      void read<{ items?: NoteFinalPayload[] }>("/api/meeting-worklogs").then((body) => {
        if (cancelled || !body?.items?.length) return;
        setNotes((prev) => hydrateNotes(prev, body.items!));
      });
      void loadCandidateLedger(meetingId)
        .then((res) => {
          if (cancelled || !res.ok) return;
          setCandidates((prev) => hydrateCandidates(prev, res));
        })
        .catch(() => undefined);
      void read<{ open?: SuggestionRow[]; saved?: SuggestionRow[] }>("/api/meeting-suggestions").then((body) => {
        if (!cancelled && body) setSuggestions((prev) => hydrateSuggestions(prev, body));
      });
      void read<{ items?: ContextFillRow[] }>("/api/meeting-context-fills").then((body) => {
        if (!cancelled && body) setContextFills((prev) => hydrateContextFills(prev, body));
      });
      void read<{ items?: AlertRow[] }>("/api/meeting-alerts").then((body) => {
        if (!cancelled && body) setAlerts((prev) => hydrateAlerts(prev, body));
      });
      void read<{ items?: AgendaItem[]; wrap_up_started_at?: string | null }>("/api/meeting-agenda").then((body) => {
        if (cancelled) return;
        setAgenda((prev) => hydrateAgenda(prev, Array.isArray(body?.items) ? body!.items! : null));
        // The stored wrap-up is the truth after a reconnect (a missed "wrap-up" event).
        if (body && "wrap_up_started_at" in body) setWrapUp(initialWrapUp(body.wrap_up_started_at));
      });
      void loadChatHistory(meetingId)
        .then((res) => {
          if (cancelled || !res.ok) return;
          const first = !chatLoaded;
          chatLoaded = true;
          setChat((prev) => hydrateChat(prev, res.items, meRef.current, first && prev.items.length === 0));
        })
        .catch(() => undefined);
    };

    const reauth = async (): Promise<void> => {
      if (!socket.connected) return;
      try {
        const token = await getTokenRef.current();
        if (!token || cancelled) return;
        await socket.timeout(ACK_TIMEOUT_MS).emitWithAck("reauth", { token });
      } catch {
        // A missed refresh is retried on the next tick; the next connect gets a fresh token anyway.
      }
    };

    const scheduleRetry = () => {
      window.clearTimeout(retryTimer);
      if (attempts >= MAX_RECONNECT_ATTEMPTS) {
        socket.disconnect();
        setStatus("error");
        return;
      }
      retryTimer = window.setTimeout(() => {
        if (!cancelled) socket.connect();
      }, backoffMs(attempts));
      attempts += 1;
    };

    const join = () => {
      rehydrate();
      socket.emit("join", { meetingId }, (ack: JoinAck) => {
        if (cancelled) return;
        if (ack?.ok) {
          attempts = 0;
          joinedRef.current = true;
          setEverJoined(true);
          setStatus("joined");
          setPresence(ack.presence ?? []);
        } else if (ack?.error === "FORBIDDEN") {
          setStatus("forbidden");
        } else {
          setStatus("error");
        }
      });
    };

    // Re-join on every (re)connect: Socket.io reconnects with a NEW socket id, and room
    // membership does not survive it.
    socket.on("connect", () => {
      join();
      window.clearInterval(reauthTimer);
      reauthTimer = window.setInterval(() => void reauth(), REAUTH_MS);
    });
    socket.on("disconnect", (reason) => {
      if (cancelled) return;
      window.clearInterval(reauthTimer);
      joinedRef.current = false;
      setStatus(reason === "io client disconnect" ? "connecting" : "reconnecting");
      // The server closed it (a deploy, a kick): Socket.io does not come back on its own then.
      if (reason === "io server disconnect") scheduleRetry();
    });
    socket.on("connect_error", () => {
      if (cancelled) return;
      setStatus((prev) => (prev === "joined" || prev === "reconnecting" ? "reconnecting" : "connecting"));
      // A handshake the gateway refused (an expired token, a deploy in progress) leaves the
      // socket inactive; a transport failure keeps Socket.io retrying by itself. Either way, give
      // up after MAX_RECONNECT_ATTEMPTS and say so.
      if (!socket.active) {
        scheduleRetry();
      } else {
        attempts += 1;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          socket.disconnect();
          setStatus("error");
        }
      }
    });

    const mine = <P,>(handler: (payload: P) => void) => (event: { meetingId?: string; payload?: P }) => {
      if (cancelled || event?.meetingId !== meetingId || event.payload === undefined) return;
      handler(event.payload);
    };

    socket.on("caption", mine<CaptionPayload>((p) => setCaptions((prev) => applyCaption(prev, p))));
    socket.on("agent-delta", mine<NoteDeltaPayload>((p) => setNotes((prev) => applyNoteDelta(prev, p))));
    socket.on("agent-note", mine<NoteFinalPayload>((p) => setNotes((prev) => applyNoteFinal(prev, p))));
    socket.on("agent-candidate", mine<CandidateEventPayload>((p) => setCandidates((prev) => applyLiveCandidates(prev, p))));
    socket.on("agent-suggestion", mine<SuggestionEventPayload>((p) => setSuggestions((prev) => applyLiveSuggestions(prev, p))));
    socket.on("agent-context", mine<ContextFillEventPayload>((p) => setContextFills((prev) => applyLiveContextFill(prev, p))));
    socket.on("agent-alert", mine<AlertEventPayload>((p) => setAlerts((prev) => applyLiveAlert(prev, p, meetingId))));
    socket.on("agent-agenda", mine<AgentAgendaPayload>((p) => setAgenda((prev) => applyAgentAgenda(prev, p))));
    socket.on("agent-nudge", mine<AgentNudgePayload>((p) => setNudges((prev) => applyNudge(prev, p))));
    // The shared candidate ledger and the host's agenda changes, verified by the gateway.
    socket.on(
      "candidate-resolution",
      mine<ResolutionPayload>((p) => setCandidates((prev) => applyResolution(prev, p, Date.now()))),
    );
    socket.on("candidate-lock", mine<LockPayload>((p) => setCandidates((prev) => applyLock(prev, p))));
    socket.on(
      "agenda-status",
      mine<{ item?: AgendaItem; items?: AgendaItem[] }>((p) =>
        setAgenda((prev) => applyHostAgendaRows(prev, Array.isArray(p.items) ? p.items : [p.item])),
      ),
    );
    socket.on(
      "room-state",
      mine<{ locks?: Array<{ candidateId: string; byUserId: string; until: number }>; hands?: Array<{ userId: string; at: string }> }>(
        (p) => {
          setCandidates((prev) => applyRoomLocks(prev, p.locks));
          setHands(applyRoomHands(p.hands));
        },
      ),
    );
    socket.on("hand", mine<{ userId?: string; raised?: boolean; at?: string }>((p) => setHands((prev) => applyHand(prev, p))));
    socket.on(
      "reaction",
      mine<{ id?: string; userId?: string; reaction?: string }>((p) => setReactions((prev) => applyReaction(prev, p, Date.now()))),
    );
    socket.on("meeting-ended", mine<MeetingEnded>((p) => setEnded({ byUserId: p.byUserId, at: p.at })));
    // The host's close-out wrap-up (polish program): open with its deadline, or kept going.
    socket.on(
      "wrap-up",
      mine<{ state?: string; startedAt?: string; endsAt?: string; byUserId?: string }>((p) =>
        setWrapUp((prev) => applyWrapUp(prev, p)),
      ),
    );
    // Chat is not wrapped: the relay is `{ meetingId, ...fields }`, not `{ meetingId, payload }`.
    socket.on("chat", (event: LiveChatPayload) => {
      if (cancelled || event?.meetingId !== meetingId) return;
      setChat((prev) => applyLiveChat(prev, event, meRef.current));
    });
    socket.on("chat-saved", mine<{ clientMsgId?: string; id?: string; createdAt?: string }>((p) => setChat((prev) => applyChatSaved(prev, p))));
    socket.on("presence", (members: string[]) => {
      if (!cancelled) setPresence(Array.isArray(members) ? members : []);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(reauthTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [url, meetingId, generation]);

  // Fades: settled cards and floating reactions leave after a few seconds.
  const needsTick = Object.keys(candidates.settled).length > 0 || reactions.length > 0;
  useEffect(() => {
    if (!needsTick) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      setCandidates((prev) => expireSettled(prev, now));
      setReactions((prev) => expireReactions(prev, now));
    }, 500);
    return () => window.clearInterval(id);
  }, [needsTick]);

  const retry = useCallback(() => {
    setStatus(url ? "connecting" : "disabled");
    setGeneration((g) => g + 1);
  }, [url]);

  /** Emit with an ack, refreshing the gateway's copy of our token first when it verifies with core-api. */
  const emitAck = useCallback(async (event: string, payload: object, refresh = false): Promise<RoomAck> => {
    const socket = socketRef.current;
    if (!socket?.connected || !joinedRef.current) return NOT_CONNECTED;
    try {
      if (refresh) {
        const token = await getTokenRef.current();
        if (token) await socket.timeout(ACK_TIMEOUT_MS).emitWithAck("reauth", { token });
      }
      return (await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, { meetingId, ...payload })) as RoomAck;
    } catch {
      return { ok: false, error: "TIMEOUT" };
    }
  }, [meetingId]);

  const announceCandidate = useCallback(
    (id: string, outcome: CandidateOutcome) => emitAck("candidate-resolved", { candidateId: id, outcome }, true),
    [emitAck],
  );
  const settleCandidate = useCallback(
    (id: string, outcome: "confirmed" | "dismissed", by?: string | null) =>
      setCandidates((prev) => settleLocally(prev, id, outcome, by ?? meRef.current ?? "", Date.now())),
    [],
  );
  const updateCandidate = useCallback(
    (id: string, patch: Partial<Pick<Candidate, "content" | "rationale" | "assigneeId" | "dueDate">>) =>
      setCandidates((prev) => updateCandidateIn(prev, id, patch)),
    [],
  );
  const hideCandidate = useCallback(
    (id: string) => {
      setCandidates((prev) => hideCandidateIn(prev, id));
      try {
        const ids = new Set(readHidden(meetingId));
        ids.add(id);
        localStorage.setItem(hiddenKey(meetingId), JSON.stringify(Array.from(ids).slice(-200)));
      } catch {
        // Storage blocked: hidden for this visit only.
      }
    },
    [meetingId],
  );
  const lockCandidate = useCallback(
    (id: string, locked: boolean) => emitAck("candidate-lock", { candidateId: id, locked }),
    [emitAck],
  );

  const resolveSuggestion = useCallback(
    (id: string, outcome: "asked" | "dismissed") => setSuggestions((prev) => resolveSuggestionIn(prev, id, outcome)),
    [],
  );
  const markSuggestionSaved = useCallback((id: string) => setSuggestions((prev) => saveSuggestionIn(prev, id)), []);
  const dismissContextFill = useCallback((id: string) => setContextFills((prev) => dismissContextFillIn(prev, id)), []);

  const agendaHost = useMemo(
    () => ({
      begin: (itemId: string, s: AgendaStatus, op: number) => setAgenda((prev) => beginHostStatus(prev, itemId, s, op)),
      commit: (itemId: string, op: number, row: AgendaItem | null) =>
        setAgenda((prev) => commitHostStatus(prev, itemId, op, row)),
      rollback: (itemId: string, op: number) => setAgenda((prev) => rollbackHostStatus(prev, itemId, op)),
      announce: (itemId: string) => emitAck("agenda-status", { itemId }, true),
      applyRows: (rows: AgendaItem[]) => setAgenda((prev) => applyServerRows(prev, rows)),
      announceMany: (itemIds: string[]) => emitAck("agenda-status", { itemIds }, true),
    }),
    [emitAck],
  );
  const dismissNudge = useCallback((id: string) => setNudges((prev) => dismissNudgeIn(prev, id)), []);
  const markAlertRead = useCallback((id: string) => setAlerts((prev) => markAlertReadIn(prev, id)), []);
  const dismissAlert = useCallback((id: string) => setAlerts((prev) => dismissAlertIn(prev, id)), []);

  const sendChat = useCallback(
    (content: string) => {
      const text = content.trim();
      if (!text) return;
      const clientMsgId = clientId();
      setChat((prev) => addOwnMessage(prev, { clientMsgId, senderId: meRef.current, content: text, at: new Date().toISOString() }));
      void (async () => {
        const socket = socketRef.current;
        if (!socket?.connected || !joinedRef.current) {
          setChat((prev) => ackOwnMessage(prev, clientMsgId, { ok: false }));
          return;
        }
        try {
          const ack = (await socket
            .timeout(ACK_TIMEOUT_MS)
            .emitWithAck("chat", { meetingId, content: text, clientMsgId })) as { ok: boolean; persisted?: boolean };
          setChat((prev) => ackOwnMessage(prev, clientMsgId, ack));
        } catch {
          setChat((prev) => ackOwnMessage(prev, clientMsgId, { ok: false }));
        }
      })();
    },
    [meetingId],
  );
  const markChatSeen = useCallback(() => setChat((prev) => markChatSeenIn(prev)), []);

  const setHand = useCallback((raised: boolean) => emitAck("hand", { raised }), [emitAck]);
  const react = useCallback((reaction: ReactionId) => emitAck("reaction", { reaction }), [emitAck]);
  const announceEnd = useCallback(() => emitAck("end-meeting", {}, true), [emitAck]);
  const announceWrapUp = useCallback(() => emitAck("wrap-up", {}, true), [emitAck]);

  return useMemo(
    () => ({
      status,
      everJoined,
      retry,
      captions,
      presence,
      notes,
      candidates,
      announceCandidate,
      settleCandidate,
      updateCandidate,
      hideCandidate,
      lockCandidate,
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
      chat,
      sendChat,
      markChatSeen,
      hands,
      setHand,
      reactions,
      react,
      ended,
      announceEnd,
      wrapUp,
      setWrapUp,
      announceWrapUp,
    }),
    [
      status,
      everJoined,
      retry,
      captions,
      presence,
      notes,
      candidates,
      announceCandidate,
      settleCandidate,
      updateCandidate,
      hideCandidate,
      lockCandidate,
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
      chat,
      sendChat,
      markChatSeen,
      hands,
      setHand,
      reactions,
      react,
      ended,
      announceEnd,
      wrapUp,
      announceWrapUp,
    ],
  );
}
