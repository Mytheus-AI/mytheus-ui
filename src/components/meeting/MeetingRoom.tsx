"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import { ParticipantEvent, RoomEvent, Track, type LocalTrackPublication } from "livekit-client";
import { ArrowLeft, Record, ShieldCheck } from "@phosphor-icons/react";
import { AgentSidebar, type AgentAttention, type CandidateLedger } from "@/components/sidebar/AgentSidebar";
import { AgentHead } from "@/components/sidebar/AgentHead";
import { AgendaPanel } from "@/components/sidebar/AgendaPanel";
import { LiveVideoGrid } from "@/components/meeting/LiveVideoGrid";
import { LiveCaptions } from "@/components/meeting/LiveCaptions";
import { CallToastProvider, useCallToast } from "@/components/call/CallToast";
import { CallTopBar } from "@/components/call/CallTopBar";
import { CALL_PREFS_KEY } from "@/components/call/prefs";
import { CONSENT_VERSION, ConsentTerms } from "@/components/call/consent";
import { ChatPanel } from "@/components/room/ChatPanel";
import { ConnectionPill } from "@/components/room/ConnectionPill";
import { ControlBar } from "@/components/room/ControlBar";
import { NotesView } from "@/components/room/NotesView";
import { PeoplePanel } from "@/components/room/PeoplePanel";
import { HandsQueue } from "@/components/room/HandsQueue";
import { ReactionLayer } from "@/components/room/ReactionLayer";
import { RoomClock } from "@/components/room/RoomClock";
import { CatchUpLine } from "@/components/room/CatchUpLine";
import { OffRecordAsks, OffRecordBanner, WhatIsRecorded } from "@/components/room/OffRecord";
import { endOffRecord, startOffRecord } from "@/app/actions/off-record";
import { StageBar } from "@/components/room/StageBar";
import { AgendaQuickAdd } from "@/components/room/AgendaQuickAdd";
import { StandInDialog, StandInQuestions } from "@/components/room/StandIn";
import { WrapUpSheet, WrappingBanner } from "@/components/room/WrapUp";
import { cancelWrapUp, startWrapUp } from "@/components/room/stage-actions";
import { SteadyRoomGrid, type RoomLayout, type RoomTile } from "@/components/room/RoomGrid";
import { RoomPanel, SECTION_IDS, type PanelTab } from "@/components/room/RoomPanel";
import { useCompactBar, useNarrow } from "@/components/room/useNarrow";
import { useOrgContext } from "@/lib/org-context";
import { useLiveKitRoom } from "@/lib/realtime/useLiveKitRoom";
import { RoomNamesProvider, type RoomNames } from "@/lib/realtime/room-names";
import { orderedNotes } from "@/lib/realtime/notes";
import { decidedItems, lockedBy, orderedCandidates, recentSettlements } from "@/lib/realtime/candidates";
import { openSuggestions, savedSuggestions } from "@/lib/realtime/suggestions";
import { visibleContextFills } from "@/lib/realtime/contextFills";
import { orderedAlerts } from "@/lib/realtime/alerts";
import { useMeetingSocket } from "@/lib/realtime/useMeetingSocket";
import { useFloorAttempts } from "@/lib/realtime/useFloorAttempts";
import { ResumePointPin } from "@/components/room-signals/ResumePointPin";
import { roomConnection } from "@/lib/realtime/connection";
import { elapsedSeconds } from "@/lib/realtime/meeting-clock";
import {
  handAnnouncement,
  handPlace,
  handQueue,
  ordinal,
  peopleGroups,
  quietSpeech,
  spokeLongEnough,
  stepSpeech,
  type SpeechRun,
} from "@/lib/realtime/room-live";
import { keyTargetOf, loadShortcutsEnabled, saveShortcutsEnabled, shortcutFor } from "@/lib/realtime/shortcuts";
import { unreadCount } from "@/lib/realtime/chat";
import { agentFace, agentSeedFor, type AgentFace } from "@/lib/realtime/agent-persona";
import type { Proxy } from "@/lib/realtime/agenda";
import { dueQuestions, initialWrapUp, isLateJoin } from "@/lib/realtime/stage";
import type { WrapUpClosedWire, WrapUpWire } from "@/lib/api/room-stage-types";
import type { AgentPersonality } from "@/lib/api/meeting-agenda-types";
import type { CallMeeting } from "@/components/call/resolve-meeting";

/* The meeting room, full screen in the (call) layout: the top bar (title, who is here, the
   Call / Notes switch, Share link, panel toggle), the stage (a large speaker frame with
   thumbnails, or a grid) with the clock, captions, reactions and the dark control bar floating
   over it, and the side panel (Agent, Chat, People tabs) that collapses to a rail. Under 960px it
   is one column with the panel as a sheet under the stage.

   Polish program, Phase 0, in this file:
   - one honest connection line for the call and the meeting link (ConnectionPill), each of which
     reconnects by itself with a fresh token;
   - consent asked right here if the server still needs it (never a loop back to the pre-join);
   - the shared candidate ledger, host agenda changes, raise hand, reactions, persisted chat,
     "End for everyone" with a confirm step, all through the meeting link;
   - Notes mode keeps Needs you, alerts and the agenda in a rail, and is remembered only for this
     meeting in this tab;
   - single-key shortcuts with an off switch that never fire while you type.

   ADR-0039 B5, C5: everyone who sent their agent instead of coming is on the stage as an agent
   tile carrying their update (unless they joined after all).

   Wave 3: Off the record (the host or creator takes the meeting off the record and back, anyone
   else asks; a room-wide banner while it runs, captions and agents paused, enforced by the server),
   "What is recorded" (your own consent receipt), and the caption language (live translation). */

export type RoomMode = "call" | "notes";

/** You in this room (ADR-0038 D11), resolved server-side from the member list. */
export type RoomMe = {
  id: string;
  name: string;
  agentName: string | null;
  agentSeed: string | null;
  personality: AgentPersonality | null;
  /** You host or created the meeting: the agenda controls, nudges and End for everyone are yours. */
  steers: boolean;
};

/** What meeting-service holds about your place in this call (`GET /api/meetings/:id/session`). */
export type RoomSessionInfo = {
  consentRequired: boolean;
  consentedAt: string | null;
  recording: boolean;
  startedAt: string | null;
};

/** The person behind a tile id (`{identity}:{source}`, or "self" before the call connects). */
function tilePerson(id: string, selfId: string | undefined): string | undefined {
  if (id === "self") return selfId;
  return id.split(":")[0] || undefined;
}

/* Remembered for this meeting in this tab only (a reload keeps it; the next meeting starts in
   Call). It used to be remembered for every meeting, silently. */
const modeKey = (meetingId: string) => `mytheus.room-mode.${meetingId}`;

/** Plain words for why the call would not let you in, keyed by the server's stable code. */
function joinProblem(code: string | null): string {
  switch (code) {
    case "NOT_A_PARTICIPANT":
      return "You are not on this meeting's participant list, so the call cannot let you in. Ask the host to add you.";
    case "VERSION_CONFLICT":
      return "This meeting has ended.";
    case "EXTERNAL_MEETING":
      return "This meeting happens in Google Meet, Teams or Zoom, so it has no Mytheus call to join. Open it from your calendar.";
    case "NOT_FOUND":
      return "This meeting could not be found. It may have been removed.";
    default:
      return "Could not connect to the call. Check your connection and try again.";
  }
}

/** Why the browser would not give the call a device, in words a person can act on. */
function deviceProblem(device: "microphone" | "camera", err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return `Your browser is blocking the ${device}. Allow it from the icon in the address bar, then try again.`;
  if (name === "NotReadableError" || name === "AbortError") return `Another app is using your ${device}. Close it, then try again.`;
  if (name === "NotFoundError" || name === "OverconstrainedError") return `No ${device} was found. Plug one in, then try again.`;
  return `Could not turn on your ${device}. Try again.`;
}

/* Raises a device problem as a call toast; it lives inside CallToastProvider, which the room
   renders itself. `at` makes the same message twice still show twice. */
function DeviceNote({ note }: { note: { text: string; at: number } | null }) {
  const toast = useCallToast();
  useEffect(() => {
    if (note) toast(note.text, "error");
  }, [note, toast]);
  return null;
}

export function MeetingRoom(props: {
  meeting: CallMeeting;
  names?: RoomNames;
  me?: RoomMe | null;
  session?: RoomSessionInfo | null;
}) {
  return (
    <RoomNamesProvider names={props.names ?? {}}>
      <CallToastProvider>
        <Room {...props} />
      </CallToastProvider>
    </RoomNamesProvider>
  );
}

function Room({
  meeting,
  names = {},
  me = null,
  session = null,
}: {
  meeting: CallMeeting;
  names?: RoomNames;
  me?: RoomMe | null;
  session?: RoomSessionInfo | null;
}) {
  const toast = useCallToast();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  // Everyone visible by default; a shared screen takes the spotlight (see the effect below).
  const [layout, setLayout] = useState<RoomLayout>("grid");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PanelTab | null>("agent");
  const [attention, setAttention] = useState<AgentAttention>({ count: 0, conflict: false });
  const [shareUrl, setShareUrl] = useState(`/meetings/${meeting.id}/join`);
  const [screenOn, setScreenOn] = useState(false);
  const [shortcutsOn, setShortcutsOn] = useState(true);
  const [ending, setEnding] = useState(false);
  const [endedByMe, setEndedByMe] = useState(false);
  // The close-out ritual and the room's edges (polish program, Phase 1).
  const [wrapUpStart, setWrapUpStart] = useState<WrapUpWire | null>(null);
  const [closedInfo, setClosedInfo] = useState<WrapUpClosedWire | null>(null);
  const [lateJoin, setLateJoin] = useState(false);
  const [standInFor, setStandInFor] = useState<string | null>(null);
  const [questionsDone, setQuestionsDone] = useState<Record<string, true>>({});
  const [mode, setMode] = useState<RoomMode>("call");
  // Off the record (wave 3): a start or end in flight, your own pending ask, the receipt dialog.
  const [offBusy, setOffBusy] = useState(false);
  const [askedAt, setAskedAt] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [addAgendaOpen, setAddAgendaOpen] = useState(false);
  useEffect(() => {
    setShortcutsOn(loadShortcutsEnabled());
    try {
      if (sessionStorage.getItem(modeKey(meeting.id)) === "notes") setMode("notes");
    } catch {
      // Storage blocked: start in Call.
    }
  }, [meeting.id]);
  const switchMode = useCallback(
    (next: RoomMode) => {
      setMode(next);
      try {
        sessionStorage.setItem(modeKey(meeting.id), next);
      } catch {
        // Storage blocked: the switch still works for this visit.
      }
    },
    [meeting.id],
  );
  const changeShortcuts = useCallback(
    (on: boolean) => {
      setShortcutsOn(on);
      saveShortcutsEnabled(on);
      toast(on ? "Keyboard shortcuts on" : "Keyboard shortcuts off", "success");
    },
    [toast],
  );
  // The devices picked on the pre-join (or in the call), applied when the call publishes them.
  const deviceIds = useRef<{ mic?: string; cam?: string }>({});
  const { user } = useOrgContext();
  const narrow = useNarrow();
  const compact = useCompactBar();

  const live = useLiveKitRoom(meeting.id);
  // The Clerk session token is what the gateway's handshake authenticates. It is asked for on
  // every connect attempt (it lives about a minute), never captured once.
  const { getToken } = useAuth();
  const getSocketToken = useCallback(() => getToken(), [getToken]);
  const meId = me?.id ?? null;
  const socket = useMeetingSocket(meeting.id, {
    getToken: getSocketToken,
    meId,
    initialAgenda: meeting.agenda,
    initialWrapUpStartedAt: meeting.wrapUpStartedAt ?? null,
  });
  const myNotes = useMemo(() => orderedNotes(socket.notes), [socket.notes]);
  const candidates = useMemo(() => orderedCandidates(socket.candidates), [socket.candidates]);
  const settlements = useMemo(() => recentSettlements(socket.candidates), [socket.candidates]);
  const decided = useMemo(() => decidedItems(socket.candidates), [socket.candidates]);
  const suggestions = useMemo(() => openSuggestions(socket.suggestions), [socket.suggestions]);
  const saved = useMemo(() => savedSuggestions(socket.suggestions), [socket.suggestions]);
  const contextFills = useMemo(() => visibleContextFills(socket.contextFills), [socket.contextFills]);
  const alerts = useMemo(() => orderedAlerts(socket.alerts), [socket.alerts]);
  const startedAt = live.startedAt ?? session?.startedAt ?? null;
  const joined = socket.status === "joined";
  // Joining well after the call opened earns the catch-up line (decided once, on arrival).
  useEffect(() => {
    if (isLateJoin(session?.startedAt ?? null, Date.now())) setLateJoin(true);
  }, [session?.startedAt]);

  const liveRoom = live.status === "connected" || live.status === "reconnecting" ? live.room : null;
  const ended = useMemo(
    () => socket.ended ?? (endedByMe ? { byUserId: meId ?? "", at: "" } : null),
    [socket.ended, endedByMe, meId],
  );
  // The meeting is over for everyone: leave the call cleanly (an intended disconnect, so the
  // call does not try to reconnect).
  useEffect(() => {
    if (ended) void live.room?.disconnect();
  }, [ended, live.room]);

  // Someone starting a screen share is the one moment spotlight is clearly right.
  const sharing = live.participants.some((p) => p.isScreenShareEnabled);
  useEffect(() => {
    if (sharing) setLayout("spotlight");
  }, [sharing]);
  // Your LiveKit identity is your internal user id, the same id captions name a speaker by.
  const myUserId = liveRoom?.localParticipant.identity ?? meId ?? undefined;

  // The mic and camera you chose on the pre-join carry in; the link to share is the pre-join.
  useEffect(() => {
    setShareUrl(`${window.location.origin}/meetings/${meeting.id}/join`);
    try {
      const raw = sessionStorage.getItem(CALL_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as { micOff?: boolean; camOff?: boolean; micId?: string; camId?: string };
      deviceIds.current = { mic: prefs.micId, cam: prefs.camId };
      if (prefs.micOff) setMicOn(false);
      if (prefs.camOff) setCamOn(false);
    } catch {
      // Storage blocked or malformed: start with mic and camera on.
    }
  }, [meeting.id]);

  // A real call follows the controls: publish, mute and unpublish your actual mic, camera and
  // screen, one change at a time per device; afterwards the button follows what LiveKit reports,
  // and a refusal says why.
  const micQueue = useRef<Promise<unknown>>(Promise.resolve());
  const camQueue = useRef<Promise<unknown>>(Promise.resolve());
  const micQueueSeq = useRef(0);
  const camQueueSeq = useRef(0);
  const [deviceNote, setDeviceNote] = useState<{ text: string; at: number } | null>(null);
  const connectedRoom = live.status === "connected" ? live.room : null;
  useEffect(() => {
    if (!connectedRoom) return;
    const lp = connectedRoom.localParticipant;
    const id = deviceIds.current.mic;
    const seq = ++micQueueSeq.current;
    micQueue.current = micQueue.current.then(() =>
      lp
        .setMicrophoneEnabled(micOn, micOn && id ? { deviceId: id } : undefined)
        .then(() => {
          if (seq === micQueueSeq.current) setMicOn(lp.isMicrophoneEnabled);
        })
        .catch((err: unknown) => {
          if (seq === micQueueSeq.current) setMicOn(false);
          setDeviceNote({ text: deviceProblem("microphone", err), at: Date.now() });
        }),
    );
  }, [connectedRoom, micOn]);
  useEffect(() => {
    if (!connectedRoom) return;
    const lp = connectedRoom.localParticipant;
    const id = deviceIds.current.cam;
    const seq = ++camQueueSeq.current;
    camQueue.current = camQueue.current.then(() =>
      lp
        .setCameraEnabled(camOn, camOn && id ? { deviceId: id } : undefined)
        .then(() => {
          if (seq === camQueueSeq.current) setCamOn(lp.isCameraEnabled);
        })
        .catch((err: unknown) => {
          if (seq === camQueueSeq.current) setCamOn(false);
          setDeviceNote({ text: deviceProblem("camera", err), at: Date.now() });
        }),
    );
  }, [connectedRoom, camOn]);
  // Follow the system's default microphone when you did not pick one (a headset connecting).
  useEffect(() => {
    if (!connectedRoom) return;
    const follow = async () => {
      const track = connectedRoom.localParticipant.getTrackPublication(Track.Source.Microphone)?.audioTrack;
      if (!track || track.isMuted) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      const pinned = deviceIds.current.mic;
      if (pinned && inputs.some((d) => d.deviceId === pinned)) return;
      if (pinned) deviceIds.current.mic = undefined;
      const fallback = inputs.find((d) => d.deviceId === "default") ?? inputs[0];
      const current = track.mediaStreamTrack.getSettings();
      const sameDevice =
        track.mediaStreamTrack.readyState === "live" &&
        fallback !== undefined &&
        (fallback.groupId ? fallback.groupId === current.groupId : fallback.deviceId === current.deviceId);
      if (!fallback || sameDevice) return;
      await track.restartTrack({ deviceId: fallback.deviceId });
    };
    const onChange = () => {
      follow().catch(() => undefined);
    };
    const lp = connectedRoom.localParticipant;
    connectedRoom.on(RoomEvent.MediaDevicesChanged, onChange);
    lp.on(ParticipantEvent.TrackUnmuted, onChange);
    return () => {
      connectedRoom.off(RoomEvent.MediaDevicesChanged, onChange);
      lp.off(ParticipantEvent.TrackUnmuted, onChange);
    };
  }, [connectedRoom]);
  useEffect(() => {
    if (!connectedRoom) return;
    connectedRoom.localParticipant
      .setScreenShareEnabled(
        screenOn,
        screenOn
          ? { audio: true, systemAudio: "include", suppressLocalAudioPlayback: false, selfBrowserSurface: "exclude" }
          : undefined,
      )
      .catch(() => setScreenOn(false));
  }, [connectedRoom, screenOn]);
  useEffect(() => {
    if (!connectedRoom) return;
    const onUnpublished = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) setScreenOn(false);
    };
    connectedRoom.on(RoomEvent.LocalTrackUnpublished, onUnpublished);
    return () => {
      connectedRoom.off(RoomEvent.LocalTrackUnpublished, onUnpublished);
    };
  }, [connectedRoom]);

  // On a phone the panel starts folded so the video gets the screen.
  useEffect(() => {
    if (narrow) setSideOpen(false);
  }, [narrow]);

  // A conflict pre-empts: on a phone the panel opens on its own, once, so it cannot be missed.
  const lifted = useRef(false);
  useEffect(() => {
    if (!narrow || !attention.conflict || lifted.current) return;
    lifted.current = true;
    const id = window.setTimeout(() => setSideOpen(true), 1800);
    return () => window.clearTimeout(id);
  }, [narrow, attention.conflict]);

  const onAttention = useCallback((a: AgentAttention) => setAttention(a), []);

  /* Raise hand (UI polish pass): your control shows your place in the queue; the stage and the
     People tab show the ordered queue; the host calls on someone or lowers a hand; your hand comes
     down by itself once you have been speaking for a few seconds; every change is said once in a
     polite live region, and the people it concerns get a gentle toast. */
  const handUp = Boolean(meId && socket.hands.raised[meId]);
  const myPlace = handPlace(socket.hands, meId);
  const hands = socket.hands;
  const toggleHand = useCallback(() => {
    const raising = !handUp;
    void socket.setHand(raising).then((ack) => {
      if (!ack.ok) {
        toast(`Could not reach the meeting to ${raising ? "raise" : "lower"} your hand. Try again in a moment.`, "error");
        return;
      }
      if (!raising) return toast("Hand lowered", "success");
      const at = typeof ack.raisedAt === "string" ? ack.raisedAt : new Date().toISOString();
      const ahead = Object.entries(hands.raised).filter(([id, t]) => id !== meId && t < at).length;
      toast(
        ahead === 0 ? "Hand raised. You are first in line." : `Hand raised. You are ${ordinal(ahead + 1)} in line.`,
        "success",
      );
    });
  }, [socket, handUp, hands, meId, toast]);
  const lowerHandOf = useCallback(
    (userId: string, reason: "lowered" | "called") => {
      void socket.lowerHandOf(userId, reason).then((ack) => {
        if (ack.ok) return;
        toast(
          ack.error === "NOT_HOST"
            ? "Only the host can lower someone's hand."
            : "Could not reach the meeting just now. Try again in a moment.",
          "error",
        );
      });
    },
    [socket, toast],
  );
  const handsActions = useMemo(
    () => ({
      steers: Boolean(me?.steers),
      onCallOn: (userId: string) => lowerHandOf(userId, "called"),
      onLower: (userId: string) => lowerHandOf(userId, "lowered"),
      onLowerMine: () => {
        if (handUp) toggleHand();
      },
    }),
    [me?.steers, lowerHandOf, handUp, toggleHand],
  );
  // Said once per change, politely, for everyone; the toast only for whom it concerns.
  const [handNote, setHandNote] = useState("");
  const handChange = socket.handChange;
  useEffect(() => {
    if (!handChange) return;
    const said = handAnnouncement(handChange, {
      meId,
      steers: Boolean(me?.steers),
      place: handPlace(hands, handChange.userId),
      count: Object.keys(hands.raised).length,
      nameOf: (id) => names[id]?.name ?? "A teammate",
    });
    setHandNote(said.live);
    if (said.toast) toast(said.toast.text, said.toast.tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per change, read with the hands it produced
  }, [handChange]);
  // Your hand comes down by itself once you have been talking for a few seconds (the floor is
  // yours); a cough or a word does not count. Asked once per raise.
  const localSpeaking = Boolean(micOn && live.participants.find((p) => p.isLocal)?.isSpeaking);
  // The last word (a3): an unmute the room talked over is kept privately for after the call.
  const otherSpeakerId = live.participants.find((p) => !p.isLocal && p.isSpeaking)?.identity ?? null;
  useFloorAttempts({
    enabled: joined && liveRoom !== null,
    micOn,
    speaking: localSpeaking,
    otherSpeakerId,
    send: (a) => void socket.sendFloorAttempt(a),
  });
  const speech = useRef<SpeechRun>(quietSpeech);
  const spokeLowered = useRef(false);
  useEffect(() => {
    speech.current = stepSpeech(speech.current, localSpeaking, Date.now());
  }, [localSpeaking]);
  useEffect(() => {
    if (!handUp) {
      spokeLowered.current = false;
      return;
    }
    const t = window.setInterval(() => {
      const now = Date.now();
      speech.current = stepSpeech(speech.current, localSpeaking, now);
      if (spokeLowered.current || !spokeLongEnough(speech.current, now)) return;
      spokeLowered.current = true;
      void socket.setHand(false, "spoke").then((ack) => {
        if (ack.ok) toast("You started speaking, so your hand went down", "info");
        else spokeLowered.current = false;
      });
    }, 500);
    return () => window.clearInterval(t);
  }, [handUp, localSpeaking, socket, toast]);

  /* Off the record (wave 3). The host or creator starts and ends it through core-api (which sets
     the flag every pipeline enforces and tells the room); anyone else asks the host through the
     meeting link. This screen applies core-api's answer at once; the room echo follows. */
  const offRecord = socket.offRecord;
  const steers = Boolean(me?.steers);
  const goOffRecord = useCallback(
    async (requestedBy: string | null) => {
      if (offBusy) return;
      setOffBusy(true);
      const res = await startOffRecord(meeting.id, requestedBy);
      setOffBusy(false);
      if (!res.ok) {
        toast(res.message, "error");
        return;
      }
      socket.applyOffRecordState(res.wire);
      if (requestedBy) socket.settleOffRecordRequest(requestedBy);
      toast("Off the record. Agents are paused and nothing is transcribed.", "success");
    },
    [offBusy, meeting.id, socket, toast],
  );
  const backOnRecord = useCallback(async () => {
    if (offBusy) return;
    setOffBusy(true);
    const res = await endOffRecord(meeting.id);
    setOffBusy(false);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    socket.applyOffRecordState(res.wire);
    toast("Back on the record. Transcription and agents have resumed.", "success");
  }, [offBusy, meeting.id, socket, toast]);
  const askOffRecord = useCallback(() => {
    void socket.requestOffRecord().then((ack) => {
      if (ack.ok) {
        setAskedAt(Date.now());
        toast("Asked the host to go off the record. You will see it here when they do.", "success");
      } else if (ack.error === "RATE_LIMITED") toast("You asked a moment ago. The host has your request.", "info");
      else if (ack.error === "ALREADY_OFF_RECORD") toast("The meeting is already off the record.", "info");
      else toast("Could not reach the host just now. Try again in a moment.", "error");
    });
  }, [socket, toast]);
  // Your ask stands for 20 seconds (the gateway's limit), or until the meeting goes off the record.
  useEffect(() => {
    if (askedAt === null) return;
    if (offRecord.active) {
      setAskedAt(null);
      return;
    }
    const id = window.setTimeout(() => setAskedAt(null), Math.max(0, askedAt + 20_000 - Date.now()));
    return () => window.clearTimeout(id);
  }, [askedAt, offRecord.active]);
  // Someone else changed it: say so once (your own change already toasted).
  const lastChange = offRecord.lastChange;
  useEffect(() => {
    if (!lastChange || lastChange.by === meId) return;
    const who = lastChange.by ? names[lastChange.by]?.name ?? "The host" : "The host";
    toast(
      lastChange.active
        ? `${who} took the meeting off the record. Agents are paused and nothing is transcribed.`
        : `${who} put the meeting back on the record. Transcription and agents have resumed.`,
      "info",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per change, not per name update
  }, [lastChange]);
  const declineAsk = useCallback(
    (userId: string) => {
      void socket.declineOffRecord(userId).then((ack) => {
        if (!ack.ok) {
          socket.settleOffRecordRequest(userId);
          toast("Could not tell the room. The request is cleared on your screen.", "info");
        }
      });
    },
    [socket, toast],
  );

  // Keyboard shortcuts: M mic, V camera, C captions, L layout, H hand; 1 Call, 2 Notes. Off with
  // the switch in More; never while typing or with a modifier (WCAG 2.1.4).
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const action = shortcutFor(e, keyTargetOf(e.target as Element | null), shortcutsOn);
      if (!action) return;
      if (action === "mic") setMicOn((v) => !v);
      else if (action === "camera") setCamOn((v) => !v);
      else if (action === "captions") setCaptionsOn((v) => !v);
      else if (action === "layout") setLayout((l) => (l === "grid" ? "spotlight" : "grid"));
      else if (action === "hand" && joined) toggleHand();
      else if (action === "call") switchMode("call");
      else if (action === "notes") switchMode("notes");
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [switchMode, shortcutsOn, joined, toggleHand]);

  const selfTiles = useMemo<RoomTile[]>(
    () => [{ id: "self", name: user.name, isLocal: true, micOn, camOn, speaking: false }],
    [user.name, micOn, camOn],
  );

  // Who is here: the call's participants, plus anyone the meeting link sees (gateway presence)
  // whose audio and video are not connected (yet, or any more), so a raised hand always has a
  // person to belong to.
  const inCall = useMemo(() => {
    const base = liveRoom
      ? live.participants.map((p) => ({
          id: p.identity,
          name: p.isLocal ? user.name : p.name || names[p.identity]?.name || "Guest",
          isLocal: p.isLocal,
          micOn: p.isMicrophoneEnabled,
          speaking: p.isSpeaking,
        }))
      : [{ id: meId ?? "self", name: user.name, isLocal: true, micOn, speaking: false }];
    const seen = new Set(base.map((p) => p.id));
    for (const id of socket.presence) {
      if (seen.has(id) || id === meId) continue;
      seen.add(id);
      base.push({ id, name: names[id]?.name ?? "A teammate", isLocal: false, micOn: false, speaking: false });
    }
    return base;
  }, [liveRoom, live.participants, user.name, names, meId, micOn, socket.presence]);
  const groups = useMemo(
    () =>
      peopleGroups({
        inCall,
        invitees: meeting.participants,
        hostId: meeting.hostUserId,
        meId,
        hands: socket.hands,
        nameOf: (id) => names[id]?.name ?? "A teammate",
        agentNameOf: (id) => agentFace(id, names[id]?.name ?? null, names[id]?.agentName, names[id]?.agentSeed).name,
      }),
    [inCall, meeting.participants, meeting.hostUserId, meId, socket.hands, names],
  );

  // Everyone's agent, for the tile badges; yours also heads the sidebar.
  const myFace = useMemo<AgentFace | null>(
    () => (me ? agentFace(me.id, me.name || user.name, me.agentName, me.agentSeed) : null),
    [me, user.name],
  );
  const decorate = useCallback(
    (tiles: RoomTile[]): RoomTile[] =>
      tiles.map((t) => {
        if (t.kind === "screen") return t;
        const who = tilePerson(t.id, me?.id);
        if (!who) return t;
        const hand = Boolean(socket.hands.raised[who]);
        const place = handPlace(socket.hands, who);
        if (me && who === me.id && myFace) return { ...t, agent: myFace, handUp: hand, handPlace: place };
        const person = names[who];
        return {
          ...t,
          handUp: hand,
          handPlace: place,
          agent: agentFace(who, person?.name ?? t.name, person?.agentName, person?.agentSeed),
        };
      }),
    [me, myFace, names, socket.hands],
  );

  // Who sent their agent (ADR-0039 B5); someone who joined after all is a person on the stage.
  const proxies = useMemo<Proxy[]>(
    () =>
      meeting.participants.filter((p) => p.attendance === "agent").map((p) => ({ userId: p.id, update: p.proxyUpdate })),
    [meeting.participants],
  );
  const standInIds = useMemo(() => new Set(proxies.map((p) => p.userId)), [proxies]);
  const here = useMemo(() => new Set(live.participants.map((p) => p.identity)), [live.participants]);
  const proxyTiles = useMemo<RoomTile[]>(
    () =>
      proxies
        .filter((p) => !here.has(p.userId) && p.userId !== myUserId && p.userId !== me?.id)
        .map((p) => {
          const person = names[p.userId];
          const name = person?.name ?? "A teammate";
          return {
            id: `${p.userId}:proxy`,
            name,
            kind: "proxy" as const,
            micOn: false,
            camOn: false,
            agent: agentFace(p.userId, name, person?.agentName, person?.agentSeed),
            proxy: { forName: name, update: p.update, onOpen: () => setStandInFor(p.userId) },
          };
        }),
    [proxies, here, myUserId, me?.id, names],
  );

  const pin = (id: string | null) => {
    setPinnedId(id);
    if (id) setLayout("spotlight");
  };

  const speakerLabel = useCallback((id: string) => (id === myUserId ? "You" : names[id]?.name ?? "Someone"), [myUserId, names]);

  /* "End for everyone" opens the 60-second wrap-up (polish program, Phase 1): core-api stores its
     start (so the deadline is one fact for the whole room), the host's screen shows the sheet at
     once, and the gateway tells everyone else "The host is wrapping up". */
  const beginWrapUp = async () => {
    if (ending) return;
    setEnding(true);
    const res = await startWrapUp(meeting.id);
    setEnding(false);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    setWrapUpStart(res.wrapUp);
    socket.setWrapUp(initialWrapUp(res.wrapUp.wrap_up_started_at ?? new Date().toISOString()));
    const ack = await socket.announceWrapUp();
    if (!ack.ok) toast("Others will see the wrap-up when their room next checks in.", "info");
  };
  const keepGoing = async () => {
    const res = await cancelWrapUp(meeting.id);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    socket.setWrapUp(null);
    setWrapUpStart(null);
    void socket.announceWrapUp();
    toast("The meeting continues", "success");
  };
  const onClosed = async (closed: WrapUpClosedWire) => {
    setClosedInfo(closed);
    // core-api has it ended; now everyone in the room is told (the gateway checks it first).
    const ack = await socket.announceEnd();
    setEndedByMe(true);
    if (!ack.ok) toast("The meeting is ended. Others leave the call when their room next checks in.", "info");
  };

  // A stand-in's questions come up for the host when the item they own starts (ADR-0039 B5: the
  // questions are visible to the host and the person only, which the server already enforces).
  const due = useMemo(
    () =>
      dueQuestions(
        socket.agenda.items,
        meeting.participants
          .filter((p) => p.attendance === "agent" && p.id !== meId && !here.has(p.id))
          .map((p) => ({ userId: p.id, questions: p.proxyQuestions })),
      ).filter((d) => !questionsDone[d.key]),
    [socket.agenda.items, meeting.participants, meId, here, questionsDone],
  );
  const standIn = standInFor ? meeting.participants.find((p) => p.id === standInFor) ?? null : null;
  const nameOfPerson = useCallback(
    (id: string) => (id === me?.id ? "You" : names[id]?.name ?? "Former member"),
    [me?.id, names],
  );

  /* Drawn inside the video frame, over the picture. */
  const overlay = (
    <>
      <div className="stage-top">
        <RoomClock startedAt={startedAt} />
        {joined ? (
          <HandsQueue
            queue={handQueue(socket.hands).map((id) => ({
              userId: id,
              name: id === meId ? user.name : names[id]?.name ?? "A teammate",
              at: socket.hands.raised[id],
              isMe: id === meId,
            }))}
            steers={handsActions.steers}
            onCallOn={handsActions.onCallOn}
            onLower={handsActions.onLower}
            onLowerMine={handsActions.onLowerMine}
          />
        ) : null}
      </div>
      <ReactionLayer reactions={socket.reactions} meId={meId} />

      {/* Live captions: the real `caption` stream while the meeting link is joined. */}
      {captionsOn && joined ? (
        <LiveCaptions
          lines={socket.captions.lines}
          speakerLabel={speakerLabel}
          translation={socket.translation}
          offRecord={offRecord.active}
        />
      ) : null}

      <ControlBar
        micOn={micOn}
        camOn={camOn}
        captionsOn={captionsOn}
        gridOn={layout === "grid"}
        leaveHref={`/meetings/${meeting.id}`}
        onMic={() => setMicOn((v) => !v)}
        onCam={() => setCamOn((v) => !v)}
        // Captions exist only once the transcription stream is joined.
        onCaptions={joined ? () => setCaptionsOn((v) => !v) : undefined}
        onLayout={() => setLayout((l) => (l === "grid" ? "spotlight" : "grid"))}
        screenOn={screenOn}
        onScreen={connectedRoom ? () => setScreenOn((v) => !v) : undefined}
        handUp={handUp}
        handPlace={myPlace}
        onHand={joined ? toggleHand : undefined}
        onReact={
          joined
            ? (r) =>
                void socket.react(r).then((ack) => {
                  if (!ack.ok && ack.error !== "RATE_LIMITED") toast("Could not send the reaction.", "error");
                })
            : undefined
        }
        room={connectedRoom}
        onDevicePicked={(kind, id) => {
          deviceIds.current = { ...deviceIds.current, [kind]: id };
        }}
        shortcutsOn={shortcutsOn}
        onShortcuts={changeShortcuts}
        onEndForEveryone={me?.steers ? () => void beginWrapUp() : undefined}
        compact={compact}
        offRecord={
          joined
            ? {
                active: offRecord.active,
                steers,
                busy: offBusy,
                asked: askedAt !== null,
                onPress: steers ? () => void (offRecord.active ? backOnRecord() : goOffRecord(null)) : askOffRecord,
              }
            : undefined
        }
        captionLanguage={{
          value: socket.translation.language,
          onChange: (language) =>
            void socket.setCaptionLanguage(language).then((ack) => {
              if (!ack.ok && ack.error !== "NOT_CONNECTED") toast("Could not change the caption language. Try again.", "error");
            }),
        }}
        onWhatIsRecorded={() => setReceiptOpen(true)}
      />
    </>
  );

  const stage = (tiles: RoomTile[]) => (
    <SteadyRoomGrid
      tiles={[...decorate(tiles), ...proxyTiles]}
      layout={layout}
      pinnedId={pinnedId}
      onPin={pin}
      onShowAll={() => setLayout("grid")}
      overlay={overlay}
    />
  );

  const ledger = useMemo<CandidateLedger>(
    () => ({
      meId,
      steers: Boolean(me?.steers),
      settlements,
      lockedBy: (id) => lockedBy(socket.candidates, id, meId, Date.now()),
      settle: socket.settleCandidate,
      announce: socket.announceCandidate,
      update: socket.updateCandidate,
      hide: socket.hideCandidate,
      lock: socket.lockCandidate,
    }),
    [meId, me?.steers, settlements, socket.candidates, socket.settleCandidate, socket.announceCandidate, socket.updateCandidate, socket.hideCandidate, socket.lockCandidate],
  );

  const liveState: "listening" | "paused" | "off" | "off_record" = joined
    ? offRecord.active
      ? "off_record"
      : "listening"
    : socket.status === "disabled" || socket.status === "forbidden"
      ? "off"
      : "paused";
  const meetingSeconds = useCallback(() => elapsedSeconds(startedAt, Date.now()), [startedAt]);

  const agenda = (
    <AgendaPanel
      meetingId={meeting.id}
      agenda={socket.agenda}
      host={socket.agendaHost}
      nudges={socket.nudges}
      onDismissNudge={socket.dismissNudge}
      steers={Boolean(me?.steers)}
      nameOf={(id) => (id === me?.id ? "You" : names[id]?.name ?? "Former member")}
      proxies={proxies}
    />
  );

  const sidebar = (variant: "full" | "rail") => (
    <AgentSidebar
      variant={variant}
      head={variant === "full" && myFace ? <AgentHead face={myFace} personality={me?.personality ?? null} /> : undefined}
      agenda={agenda}
      onAttentionChange={onAttention}
      id={variant === "full" ? SECTION_IDS.agent : "cx-rail-agent"}
      live={liveState}
      notes={myNotes}
      candidates={candidates}
      ledger={ledger}
      meetingId={meeting.id}
      meetingSeconds={meetingSeconds}
      suggestions={suggestions}
      savedSuggestions={saved}
      onSuggestionResolved={socket.resolveSuggestion}
      onSuggestionSaved={socket.markSuggestionSaved}
      contextFills={contextFills}
      onContextFillDismissed={socket.dismissContextFill}
      alerts={alerts}
      onAlertRead={socket.markAlertRead}
      onAlertDismissed={socket.dismissAlert}
      agendaItems={socket.agenda.items}
      startedAt={startedAt}
      captions={socket.captions.lines}
      speakerLabel={speakerLabel}
      localSpeaking={Boolean(live.participants.find((p) => p.isLocal)?.isSpeaking)}
    />
  );

  const chatPanel = (visible: boolean) => (
    <ChatPanel
      id={SECTION_IDS.chat}
      chat={socket.chat}
      connected={joined}
      visible={visible}
      onSend={socket.sendChat}
      onSeen={socket.markChatSeen}
    />
  );

  const whenLine = `${new Date(meeting.startTime).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })}, ${groups.inCall.length} in call`;
  const notesView = (tiles: RoomTile[]) => (
    <NotesView
      title={meeting.title}
      when={whenLine}
      tiles={decorate(tiles)}
      notes={myNotes}
      lines={socket.captions.lines}
      speakerLabel={speakerLabel}
      micOn={micOn}
      camOn={camOn}
      onMic={() => setMicOn((v) => !v)}
      onCam={() => setCamOn((v) => !v)}
      onBackToCall={() => switchMode("call")}
      leaveHref={`/meetings/${meeting.id}`}
      chat={chatPanel(true)}
      rail={sidebar("rail")}
      decided={decided}
    />
  );

  const notice = roomConnection(live.status, socket.status, socket.everJoined);
  const callError =
    live.status === "error" ? { tone: "error" as const, text: joinProblem(live.error), retry: "call" as const } : null;

  if (ended) {
    const byMe = endedByMe || ended.byUserId === meId;
    return (
      <div className="mx-meet cx-call cx-room">
        <div className="cx-shell">
          <CallTopBar />
          <main className="room-ended" id="page-meeting">
            <section className="room-ended-card" aria-labelledby="room-ended-h">
              <h1 id="room-ended-h">{byMe ? "You ended the meeting for everyone" : "The host ended the meeting"}</h1>
              <p>
                {byMe
                  ? closedInfo && closedInfo.moved_decisions + closedInfo.moved_actions > 0
                    ? `Everyone has left the call. Confirmed decisions and tasks are saved; the ${closedInfo.moved_decisions + closedInfo.moved_actions} cards nobody confirmed are in ${closedInfo.review_owner_id && closedInfo.review_owner_id !== meId ? `${names[closedInfo.review_owner_id]?.name ?? "their"}'s` : "your"} review queue.`
                    : "Everyone has left the call. Confirmed decisions and tasks are saved."
                  : `${names[ended.byUserId]?.name ?? "The host"} ended this meeting for everyone. Confirmed decisions and tasks are saved, and anything left open went to the host's review queue.`}
              </p>
              <Link href={`/meetings/${meeting.id}`} className="room-ended-link tap" autoFocus>
                <ArrowLeft size={16} weight="bold" aria-hidden />
                Back to the meeting
              </Link>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-meet cx-call cx-room">
      <ConnectionPill
        notice={callError ?? notice}
        joining={live.status === "connecting"}
        onRetry={(what) => (what === "call" ? live.retry() : socket.retry())}
      />
      <DeviceNote note={deviceNote} />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {handNote}
      </p>
      <div className="cx-shell">
        <CallTopBar
          room={{
            title: meeting.title,
            inCall: groups.inCall.length,
            invited: meeting.invited,
            shareUrl,
            sideVisible: sideOpen,
            onToggleSide: () => setSideOpen((v) => !v),
            mode,
            onMode: switchMode,
            shortcutsOn,
          }}
        />
        {live.status !== "consent" ? (
          <StageBar
            meetingId={meeting.id}
            agenda={socket.agenda}
            host={socket.agendaHost}
            steers={Boolean(me?.steers)}
            nameOf={nameOfPerson}
            standInIds={standInIds}
            onAddAgenda={me?.steers ? () => setAddAgendaOpen(true) : undefined}
          >
            {joined ? (
              <ResumePointPin
                meetingId={meeting.id}
                steers={Boolean(me?.steers)}
                nameOf={nameOfPerson}
                change={socket.resumeChange}
                onAnnounce={socket.announceResumePoint}
                toast={toast}
              />
            ) : null}
            {lateJoin ? <CatchUpLine meetingId={meeting.id} nameOf={nameOfPerson} onClose={() => setLateJoin(false)} /> : null}
            {me?.steers ? (
              <StandInQuestions
                due={due}
                nameOf={nameOfPerson}
                itemTitleOf={(id) => socket.agenda.items.find((it) => it.id === id)?.title ?? null}
                onRaise={socket.sendChat}
                onDone={(key) => setQuestionsDone((d) => ({ ...d, [key]: true }))}
              />
            ) : null}
          </StageBar>
        ) : null}
        {live.status !== "consent" ? (
          <>
            <OffRecordBanner
              state={offRecord}
              steers={steers}
              nameOf={nameOfPerson}
              busy={offBusy}
              onEnd={() => void backOnRecord()}
            />
            {steers && !offRecord.active ? (
              <OffRecordAsks
                requests={socket.offRecordRequests}
                nameOf={nameOfPerson}
                busy={offBusy}
                onGrant={(userId) => void goOffRecord(userId)}
                onDecline={declineAsk}
              />
            ) : null}
          </>
        ) : null}
        {socket.wrapUp && !me?.steers ? (
          <WrappingBanner
            wrapUp={socket.wrapUp}
            hostName={names[socket.wrapUp.byUserId ?? meeting.hostUserId ?? ""]?.name ?? "The host"}
            leaveHref={`/meetings/${meeting.id}`}
          />
        ) : null}
        <main className={`cx-body${sideOpen ? "" : " side-collapsed"}${mode === "notes" ? " is-notes" : ""}`} id="page-meeting">
          {live.status === "consent" ? (
            <section className="room-consent" aria-labelledby="room-consent-h">
              <div className="pj-consent-head">
                <span className="pj-consent-ico" aria-hidden="true">
                  <Record size={22} weight="fill" />
                </span>
                <div>
                  <h2 id="room-consent-h">Before you join: this meeting is transcribed</h2>
                  <p>Your workspace asks everyone to agree once per meeting. This is what is kept.</p>
                </div>
              </div>
              <ConsentTerms recording={session?.recording ?? null} />
              <div className="room-consent-acts">
                <button type="button" className="nfy-act tap" onClick={() => live.acceptConsent(CONSENT_VERSION)} autoFocus>
                  <ShieldCheck size={16} weight="fill" aria-hidden />
                  I agree, join the call
                </button>
                <Link href={`/meetings/${meeting.id}`} className="nfy-act is-quiet tap">
                  Not now
                </Link>
              </div>
            </section>
          ) : mode === "notes" ? (
            liveRoom ? <LiveVideoGrid room={liveRoom}>{notesView}</LiveVideoGrid> : notesView(selfTiles)
          ) : liveRoom ? (
            <LiveVideoGrid room={liveRoom}>{stage}</LiveVideoGrid>
          ) : (
            stage(selfTiles)
          )}
          {/* Everyone else's microphone; your own is never rendered back to you. */}
          {liveRoom && <RoomAudioRenderer room={liveRoom} />}
          {/* Shown only when the browser blocked autoplay; one click unblocks the call. */}
          {liveRoom && <StartAudio room={liveRoom} label="Click to hear the call" className="call-start-audio tap" />}

          {mode === "call" && live.status !== "consent" && (
            <RoomPanel
              open={sideOpen}
              onOpen={() => setSideOpen(true)}
              onClose={() => setSideOpen(false)}
              attention={attention.count}
              conflict={attention.conflict}
              peopleCount={groups.inCall.length}
              chatCount={unreadCount(socket.chat)}
              onTab={setPanelTab}
              agent={sidebar("full")}
              people={
                <PeoplePanel
                  groups={groups}
                  id={SECTION_IDS.people}
                  agentSeedOf={(id) => agentSeedFor(names[id]?.agentSeed, id)}
                  hands={joined ? handsActions : undefined}
                />
              }
              chat={chatPanel(panelTab === "chat")}
            />
          )}
        </main>
      </div>

      {me?.steers && socket.wrapUp ? (
        <WrapUpSheet
          meetingId={meeting.id}
          wrapUp={socket.wrapUp}
          initial={wrapUpStart}
          participantIds={meeting.participantIds}
          meId={meId}
          nameOf={nameOfPerson}
          ledger={{ settle: socket.settleCandidate, announce: socket.announceCandidate }}
          agendaHost={socket.agendaHost}
          onKeepGoing={keepGoing}
          onClosed={onClosed}
        />
      ) : null}
      {me?.steers ? (
        <AgendaQuickAdd
          open={addAgendaOpen}
          onClose={() => setAddAgendaOpen(false)}
          meetingId={meeting.id}
          host={socket.agendaHost}
        />
      ) : null}
      <WhatIsRecorded
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        meetingId={meeting.id}
        offRecord={offRecord}
        recording={session?.recording ?? null}
      />
      {standIn ? (
        <StandInDialog
          open
          onClose={() => setStandInFor(null)}
          meetingId={meeting.id}
          userId={standIn.id}
          name={names[standIn.id]?.name ?? "A teammate"}
          face={agentFace(standIn.id, names[standIn.id]?.name ?? null, names[standIn.id]?.agentName, names[standIn.id]?.agentSeed)}
          update={standIn.proxyUpdate}
          questions={standIn.proxyQuestions}
        />
      ) : null}
    </div>
  );
}
