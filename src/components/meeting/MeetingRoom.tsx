"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AgentSidebar, type AgentAttention } from "@/components/sidebar/AgentSidebar";
import { LiveVideoGrid } from "@/components/meeting/LiveVideoGrid";
import { LiveCaptions, MockCaptions } from "@/components/meeting/LiveCaptions";
import { CallToastProvider } from "@/components/call/CallToast";
import { CallTopBar } from "@/components/call/CallTopBar";
import { CALL_PREFS_KEY } from "@/components/call/prefs";
import { ChatPanel } from "@/components/room/ChatPanel";
import { ControlBar } from "@/components/room/ControlBar";
import { PeoplePanel, type RoomPerson } from "@/components/room/PeoplePanel";
import { RoomClock } from "@/components/room/RoomClock";
import { RoomGrid, type RoomLayout, type RoomTile } from "@/components/room/RoomGrid";
import { RoomPanel, SECTION_IDS } from "@/components/room/RoomPanel";
import { useNarrow } from "@/components/room/useNarrow";
import { useLiveKitRoom } from "@/lib/realtime/useLiveKitRoom";
import { useMeetingSocket } from "@/lib/realtime/useMeetingSocket";
import { mockRoomParticipants, mockCaptions, type Meeting } from "@/lib/mock/data";

/* The meeting room, in the meeting design's shape and full screen in the (call) layout: the app
   bar (counts, title, Share link, panel toggle), the stage (a large speaker frame with thumbnails,
   or a grid) with the timer, captions and the dark control pill floating over it, and the side
   panel (agent, participants, chat) that collapses to a rail. Under 960px it is one column with
   the panel as a bottom sheet.

   Video is live LiveKit when a room is connected and the mock tiles otherwise; captions are the
   real socket stream once joined and the mock strip otherwise. Controls toggle locally so the room
   feels inhabited; nothing is transmitted anywhere. */

export function MeetingRoom({ meeting }: { meeting: Meeting }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [layout, setLayout] = useState<RoomLayout>("spotlight");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [attention, setAttention] = useState<AgentAttention>({ count: 0, conflict: false });
  const [shareUrl, setShareUrl] = useState(`/meetings/${meeting.id}/join`);
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

  const liveRoom = live.status === "connected" ? live.room : null;

  // The mic and camera you chose on the pre-join carry in; the link to share is the pre-join.
  useEffect(() => {
    setShareUrl(`${window.location.origin}/meetings/${meeting.id}/join`);
    try {
      const raw = sessionStorage.getItem(CALL_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as { micOff?: boolean; camOff?: boolean };
      if (prefs.micOff) setMicOn(false);
      if (prefs.camOff) setCamOn(false);
    } catch {
      // Storage blocked or malformed: start with mic and camera on.
    }
  }, [meeting.id]);

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

  // The design's keyboard shortcuts: M mic, V camera, C captions, L layout.
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
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  /* mock stage: the local participant (role starts with "You") follows the mic and camera
     controls; everyone else is as the mock data says */
  const mockTiles = useMemo<RoomTile[]>(
    () =>
      mockRoomParticipants.map((p) => {
        const local = p.role.startsWith("You");
        const mic = local ? micOn : p.micOn;
        return {
          id: p.name,
          name: p.name,
          role: p.role.replace(/^You\s*·\s*/, ""),
          isLocal: local,
          micOn: mic,
          camOn: local ? camOn : p.camOn,
          speaking: Boolean(p.speaking) && mic,
        };
      }),
    [micOn, camOn],
  );

  const people = useMemo<RoomPerson[]>(
    () =>
      liveRoom
        ? live.participants.map((p) => ({
            id: p.identity,
            name: p.name || p.identity,
            isLocal: p.isLocal,
            micOn: p.isMicrophoneEnabled,
            speaking: p.isSpeaking,
          }))
        : mockTiles.map((t) => ({
            id: t.id,
            name: t.name,
            role: t.role,
            isLocal: t.isLocal,
            micOn: t.micOn,
            speaking: t.speaking,
          })),
    [liveRoom, live.participants, mockTiles],
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
          socket has joined the room, otherwise the mock strip. Gated on `joined` rather than
          merely "configured" for the same reason the stage gates on `connected`: a denied
          participant check or a dropped gateway should degrade to the mock, not to an empty strip
          that looks like nobody is speaking. */}
      {captionsOn ? (
        socket.status === "joined" ? (
          <LiveCaptions lines={socket.captions.lines} />
        ) : (
          <MockCaptions lines={mockCaptions} />
        )
      ) : null}

      <ControlBar
        micOn={micOn}
        camOn={camOn}
        captionsOn={captionsOn}
        gridOn={layout === "grid"}
        leaveHref={`/meetings/${meeting.id}`}
        onMic={() => setMicOn((v) => !v)}
        onCam={() => setCamOn((v) => !v)}
        onCaptions={() => setCaptionsOn((v) => !v)}
        onLayout={() => setLayout((l) => (l === "grid" ? "spotlight" : "grid"))}
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

  return (
    <CallToastProvider>
      <div className="mx-meet cx-call">
        <div className="app">
          <CallTopBar
            room={{
              title: meeting.title,
              inCall: people.length,
              invited: meeting.participants.length,
              shareUrl,
              sideVisible: sideOpen,
              onToggleSide: () => setSideOpen((v) => !v),
            }}
          />
          <div className="app-row">
            <main className="main">
              <section
                className={`page meeting-page${sideOpen ? "" : " side-collapsed"}`}
                id="page-meeting"
              >
                {/* video stage - live LiveKit tracks once a room is actually connected, otherwise
                    the mock composition. `live.status` is "unconfigured" in every environment that
                    exists today, because no LiveKit account exists anywhere in the program yet, so
                    the mock is what renders. Gating on `connected` rather than merely "configured"
                    also means a failed mint or a dropped SFU degrades to the mock instead of an
                    empty stage. */}
                {liveRoom ? <LiveVideoGrid room={liveRoom}>{stage}</LiveVideoGrid> : stage(mockTiles)}

                <RoomPanel
                  open={sideOpen}
                  onOpen={() => setSideOpen(true)}
                  attention={attention.count}
                  conflict={attention.conflict}
                  peopleCount={people.length}
                  agent={<AgentSidebar onAttentionChange={onAttention} id={SECTION_IDS.agent} />}
                  people={<PeoplePanel people={people} id={SECTION_IDS.people} />}
                  chat={<ChatPanel id={SECTION_IDS.chat} />}
                />
              </section>
            </main>
          </div>
        </div>
      </div>
    </CallToastProvider>
  );
}
