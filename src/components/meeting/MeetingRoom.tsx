"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { RoomAudioRenderer, StartAudio } from "@livekit/components-react";
import { RoomEvent, Track, type LocalTrackPublication } from "livekit-client";
import { AgentSidebar, type AgentAttention } from "@/components/sidebar/AgentSidebar";
import { LiveVideoGrid } from "@/components/meeting/LiveVideoGrid";
import { LiveCaptions } from "@/components/meeting/LiveCaptions";
import { CallToastProvider } from "@/components/call/CallToast";
import { CallTopBar } from "@/components/call/CallTopBar";
import { CALL_PREFS_KEY } from "@/components/call/prefs";
import { ChatPanel } from "@/components/room/ChatPanel";
import { ControlBar } from "@/components/room/ControlBar";
import { NotesView } from "@/components/room/NotesView";
import { PeoplePanel, type RoomPerson } from "@/components/room/PeoplePanel";
import { RoomClock } from "@/components/room/RoomClock";
import { RoomGrid, type RoomLayout, type RoomTile } from "@/components/room/RoomGrid";
import { RoomPanel, SECTION_IDS } from "@/components/room/RoomPanel";
import { useNarrow } from "@/components/room/useNarrow";
import { useOrgContext } from "@/lib/org-context";
import { useLiveKitRoom } from "@/lib/realtime/useLiveKitRoom";
import { RoomNamesProvider, type RoomNames } from "@/lib/realtime/room-names";
import { orderedNotes } from "@/lib/realtime/notes";
import { useMeetingSocket } from "@/lib/realtime/useMeetingSocket";
import type { CallMeeting } from "@/components/call/resolve-meeting";
import type { AgentSidebarCard } from "@/lib/mock/data";

/* The meeting room, in the meeting design's shape and full screen in the (call) layout: the app
   bar (counts, title, Share link, panel toggle), the stage (a large speaker frame with thumbnails,
   or a grid) with the timer, captions and the dark control pill floating over it, and the side
   panel (agent, participants, chat) that collapses to a rail. Under 960px it is one column with
   the panel as a bottom sheet.

   Video is live LiveKit once the room is connected; before that the stage shows only your own
   tile. Captions are the real socket stream once joined and nothing otherwise. Once the call is
   connected the mic, camera and screen-share controls drive it: your devices from the pre-join
   are published, muted and unpublished for real. Before that they toggle locally. */

/** The agent's cards arrive over `agent-results`, which this room does not subscribe to yet. */
const NO_AGENT_CARDS: AgentSidebarCard[] = [];

export type RoomMode = "call" | "notes";
const ROOM_MODE_KEY = "mytheus.room-mode";

/** Plain words for why the call would not let you in, keyed by the server's stable code. */
function joinProblem(code: string | null): string {
  switch (code) {
    case "NOT_A_PARTICIPANT":
      return "You are not on this meeting's participant list, so the call cannot let you in. Ask the host to add you.";
    case "CONSENT_REQUIRED":
      return "This workspace needs your recording consent before you can join. Go back to the pre-join and accept it.";
    case "NOT_FOUND":
      return "This meeting could not be found. It may have been removed.";
    default:
      return "Could not connect to the call. Check your connection and try again.";
  }
}

export function MeetingRoom({ meeting, names = {} }: { meeting: CallMeeting; names?: RoomNames }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  // Everyone visible by default; a shared screen takes the spotlight (see the effect below).
  const [layout, setLayout] = useState<RoomLayout>("grid");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [attention, setAttention] = useState<AgentAttention>({ count: 0, conflict: false });
  const [shareUrl, setShareUrl] = useState(`/meetings/${meeting.id}/join`);
  const [screenOn, setScreenOn] = useState(false);
  // Two views of one live meeting: Call keeps the video up front, Notes turns the room into the
  // living document. Remembered per browser, so people keep the view they work in.
  const [mode, setMode] = useState<RoomMode>("call");
  useEffect(() => {
    try {
      if (localStorage.getItem(ROOM_MODE_KEY) === "notes") setMode("notes");
    } catch {
      // Storage blocked: start in Call.
    }
  }, []);
  const switchMode = useCallback((next: RoomMode) => {
    setMode(next);
    try {
      localStorage.setItem(ROOM_MODE_KEY, next);
    } catch {
      // Storage blocked: the switch still works for this visit.
    }
  }, []);
  // The devices picked on the pre-join, applied when the real call publishes them.
  const deviceIds = useRef<{ mic?: string; cam?: string }>({});
  const { user } = useOrgContext();
  const narrow = useNarrow();

  // Mints a token and connects the SFU when NEXT_PUBLIC_LIVEKIT_URL is set; reports
  // "unconfigured" and does no network work at all when it is not, which is every environment
  // today. See `useLiveKitRoom` for why that fallback is deliberate rather than a stub.
  const live = useLiveKitRoom(meeting.id);
  // The Clerk session token is what the gateway's handshake authenticates and resolves
  // org_id/user_id from; the browser never derives either itself.
  const { getToken } = useAuth();
  const [socketToken, setSocketToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getToken().then((t) => {
      if (!cancelled) setSocketToken(t);
    });
    return () => {
      cancelled = true;
    };
  }, [getToken]);
  const socket = useMeetingSocket(meeting.id, socketToken);
  const myNotes = useMemo(() => orderedNotes(socket.notes), [socket.notes]);

  const liveRoom = live.status === "connected" ? live.room : null;
  // Someone starting a screen share is the one moment spotlight is clearly right, so the room
  // switches to it once per share; the layout button still switches back.
  const sharing = live.participants.some((p) => p.isScreenShareEnabled);
  useEffect(() => {
    if (sharing) setLayout("spotlight");
  }, [sharing]);
  // Your LiveKit identity is your internal user id, the same id captions name a speaker by.
  const myUserId = liveRoom?.localParticipant.identity;

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
  // screen. If the browser refuses (permission denied, no device, share picker cancelled), the
  // control flips back so it never claims a state the call is not in.
  useEffect(() => {
    if (!liveRoom) return;
    const id = deviceIds.current.mic;
    liveRoom.localParticipant
      .setMicrophoneEnabled(micOn, micOn && id ? { deviceId: id } : undefined)
      .catch(() => setMicOn(false));
  }, [liveRoom, micOn]);
  useEffect(() => {
    if (!liveRoom) return;
    const id = deviceIds.current.cam;
    liveRoom.localParticipant
      .setCameraEnabled(camOn, camOn && id ? { deviceId: id } : undefined)
      .catch(() => setCamOn(false));
  }, [liveRoom, camOn]);
  useEffect(() => {
    if (!liveRoom) return;
    liveRoom.localParticipant.setScreenShareEnabled(screenOn).catch(() => setScreenOn(false));
  }, [liveRoom, screenOn]);
  // Stopping the share from the browser's own "Stop sharing" bar must update the button too.
  useEffect(() => {
    if (!liveRoom) return;
    const onUnpublished = (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) setScreenOn(false);
    };
    liveRoom.on(RoomEvent.LocalTrackUnpublished, onUnpublished);
    return () => {
      liveRoom.off(RoomEvent.LocalTrackUnpublished, onUnpublished);
    };
  }, [liveRoom]);

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

  // The design's keyboard shortcuts: M mic, V camera, C captions, L layout; 1 Call, 2 Notes.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "m") setMicOn((v) => !v);
      else if (k === "v") setCamOn((v) => !v);
      else if (k === "c") setCaptionsOn((v) => !v);
      else if (k === "l") setLayout((l) => (l === "grid" ? "spotlight" : "grid"));
      else if (k === "1") switchMode("call");
      else if (k === "2") switchMode("notes");
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [switchMode]);

  /* Before the call connects nobody else is known, so the stage is just you, following the mic
     and camera controls. */
  const selfTiles = useMemo<RoomTile[]>(
    () => [{ id: "self", name: user.name, isLocal: true, micOn, camOn, speaking: false }],
    [user.name, micOn, camOn],
  );

  const people = useMemo<RoomPerson[]>(
    () =>
      liveRoom
        ? live.participants.map((p) => ({
            id: p.identity,
            name: p.isLocal ? user.name : p.name || names[p.identity]?.name || "Guest",
            isLocal: p.isLocal,
            micOn: p.isMicrophoneEnabled,
            speaking: p.isSpeaking,
          }))
        : selfTiles.map((t) => ({ id: t.id, name: t.name, isLocal: true, micOn: t.micOn, speaking: false })),
    [liveRoom, live.participants, selfTiles, user.name, names],
  );

  const pin = (id: string | null) => {
    setPinnedId(id);
    if (id) setLayout("spotlight");
  };

  /* Drawn inside the video frame, over the picture. */
  const overlay = (
    <>
      <RoomClock />

      {/* live captions - the real `caption` socket stream once the gateway is reachable and this
          socket has joined the room. Until then there is no strip at all. */}
      {captionsOn && socket.status === "joined" ? <LiveCaptions
          lines={socket.captions.lines}
          speakerLabel={(id) => (id === myUserId ? "You" : names[id]?.name ?? "Someone")}
        /> : null}

      <ControlBar
        micOn={micOn}
        camOn={camOn}
        captionsOn={captionsOn}
        gridOn={layout === "grid"}
        leaveHref={`/meetings/${meeting.id}`}
        onMic={() => setMicOn((v) => !v)}
        onCam={() => setCamOn((v) => !v)}
        // Captions exist only once the transcription stream is joined; until then the button would
        // toggle nothing, so it is not offered.
        onCaptions={socket.status === "joined" ? () => setCaptionsOn((v) => !v) : undefined}
        onLayout={() => setLayout((l) => (l === "grid" ? "spotlight" : "grid"))}
        screenOn={screenOn}
        onScreen={liveRoom ? () => setScreenOn((v) => !v) : undefined}
      />
    </>
  );

  const stage = (tiles: RoomTile[]) => (
    <RoomGrid
      tiles={tiles}
      layout={layout}
      pinnedId={pinnedId}
      onPin={pin}
      onShowAll={() => setLayout("grid")}
      overlay={overlay}
    />
  );

  const whenLine = `${new Date(meeting.startTime).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} · ${people.length} in call`;
  const notesView = (tiles: RoomTile[]) => (
    <NotesView
      title={meeting.title}
      when={whenLine}
      tiles={tiles}
      notes={myNotes}
      lines={socket.captions.lines}
      speakerLabel={(id) => (id === myUserId ? "You" : names[id]?.name ?? "Someone")}
      micOn={micOn}
      camOn={camOn}
      onMic={() => setMicOn((v) => !v)}
      onCam={() => setCamOn((v) => !v)}
      onBackToCall={() => switchMode("call")}
      leaveHref={`/meetings/${meeting.id}`}
      chat={<ChatPanel id={SECTION_IDS.chat} room={liveRoom} />}
    />
  );

  return (
    <RoomNamesProvider names={names}>
    <CallToastProvider>
      <div className="mx-meet cx-call">
        {(live.status === "connecting" || live.status === "reconnecting" || live.status === "error") ? (
          <div
            role={live.status === "error" ? "alert" : "status"}
            className={`fixed left-1/2 top-[72px] z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 rounded-[14px] px-4 py-3 text-[13.5px] font-semibold shadow-[var(--shadow-card)] ${
              live.status === "error"
                ? "bg-[var(--prioHighBg)] text-[var(--prioHigh)]"
                : "bg-[var(--surface)] text-[var(--body)]"
            }`}
          >
            {live.status === "error"
              ? joinProblem(live.error)
              : live.status === "reconnecting"
                ? "Reconnecting to the call..."
                : "Connecting to the call..."}
          </div>
        ) : null}
        <div className="app">
          <CallTopBar
            room={{
              title: meeting.title,
              inCall: people.length,
              invited: meeting.invited,
              shareUrl,
              sideVisible: sideOpen,
              onToggleSide: () => setSideOpen((v) => !v),
              mode,
              onMode: switchMode,
            }}
          />
          <div className="app-row">
            <main className="main">
              <section
                className={`page meeting-page${sideOpen ? "" : " side-collapsed"}${mode === "notes" ? " is-notes" : ""}`}
                id="page-meeting"
              >
                {/* video stage - live LiveKit tracks once the room is connected, otherwise your own
                    tile while it connects (or if it cannot). */}
                {mode === "notes"
                  ? liveRoom
                    ? <LiveVideoGrid room={liveRoom}>{notesView}</LiveVideoGrid>
                    : notesView(selfTiles)
                  : liveRoom
                    ? <LiveVideoGrid room={liveRoom}>{stage}</LiveVideoGrid>
                    : stage(selfTiles)}
                {/* Everyone else's microphone. The grid only attaches VIDEO; without this every
                    remote audio track was subscribed and never played, so nobody could hear
                    anybody. Your own mic is never rendered back to you. */}
                {liveRoom && <RoomAudioRenderer room={liveRoom} />}
                {/* Shown only when the browser blocked autoplay; one click unblocks the call. */}
                {liveRoom && (
                  <StartAudio room={liveRoom} label="Click to hear the call" className="call-start-audio tap" />
                )}

                {mode === "call" && (
                <RoomPanel
                  open={sideOpen}
                  onOpen={() => setSideOpen(true)}
                  attention={attention.count}
                  conflict={attention.conflict}
                  peopleCount={people.length}
                  agent={<AgentSidebar onAttentionChange={onAttention} id={SECTION_IDS.agent} items={NO_AGENT_CARDS} notes={myNotes} />}
                  people={<PeoplePanel people={people} id={SECTION_IDS.people} />}
                  chat={<ChatPanel id={SECTION_IDS.chat} room={liveRoom} />}
                />
                )}
              </section>
            </main>
          </div>
        </div>
      </div>
    </CallToastProvider>
    </RoomNamesProvider>
  );
}
