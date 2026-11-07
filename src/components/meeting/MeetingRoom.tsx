"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Clock, Info, SquaresFour, Users, Layout } from "@phosphor-icons/react";
import { AgentSidebar, type AgentAttention } from "@/components/sidebar/AgentSidebar";
import { LiveVideoGrid } from "@/components/meeting/LiveVideoGrid";
import {
  CaptionFrame,
  CaptionText,
  LiveCaptions,
} from "@/components/meeting/LiveCaptions";
import { ChatPanel } from "@/components/room/ChatPanel";
import { ControlBar } from "@/components/room/ControlBar";
import { PeoplePanel, type RoomPerson } from "@/components/room/PeoplePanel";
import { RoomClock } from "@/components/room/RoomClock";
import { RoomGrid, type RoomLayout, type RoomTile } from "@/components/room/RoomGrid";
import { RoomPanel, type PanelTab, type SheetSize } from "@/components/room/RoomPanel";
import { useNarrow } from "@/components/room/useNarrow";
import { speakerColorIndex } from "@/lib/realtime/captions";
import { useLiveKitRoom } from "@/lib/realtime/useLiveKitRoom";
import { useMeetingSocket } from "@/lib/realtime/useMeetingSocket";
import { mockRoomParticipants, mockCaptions, type Meeting } from "@/lib/mock/data";

/* The meeting room: a peach-wash stage (top bar, participant grid, live captions, dark pill
   controls) beside a tabbed panel (Agent / Chat / People) that collapses to a rail, and becomes a
   bottom sheet under 960px. Video is live LiveKit when a room is connected and the mock grid
   otherwise; captions are the real socket stream once joined and the mock strip otherwise.
   Controls toggle locally so the room feels inhabited, nothing is transmitted anywhere. */

/* Tailwind classes shared by the top-bar pills. */
const PILL =
  "inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink shadow-sm max-[959px]:h-[34px] max-[959px]:px-2.5";

export function MeetingRoom({ meeting }: { meeting: Meeting }) {
  const [tab, setTab] = useState<PanelTab>("agent");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [layout, setLayout] = useState<RoomLayout>("grid");
  const [spotlightId, setSpotlightId] = useState<string | null>(null);
  // Desktop expands to a card or collapses to a rail; a phone has a sheet with three snap heights.
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [sheet, setSheet] = useState<SheetSize>("peek");
  const [attention, setAttention] = useState<AgentAttention>({ count: 0, conflict: false });
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

  // A conflict pre-empts: on a phone the sheet lifts on its own, once, so it cannot be missed.
  const lifted = useRef(false);
  useEffect(() => {
    if (!narrow || !attention.conflict || lifted.current) return;
    lifted.current = true;
    const id = window.setTimeout(() => setSheet((s) => (s === "peek" ? "half" : s)), 1800);
    return () => window.clearTimeout(id);
  }, [narrow, attention.conflict]);

  const onAttention = useCallback((a: AgentAttention) => setAttention(a), []);

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
          }))
        : mockTiles.map((t) => ({
            id: t.id,
            name: t.name,
            role: t.role,
            isLocal: t.isLocal,
            micOn: t.micOn,
          })),
    [liveRoom, live.participants, mockTiles],
  );

  const spotlight = (id: string) => {
    setSpotlightId(id);
    setLayout("spotlight");
  };

  const panelPressed = narrow ? sheet !== "peek" : desktopOpen;
  const togglePanel = () => {
    if (narrow) setSheet((s) => (s === "peek" ? "half" : "peek"));
    else setDesktopOpen((o) => !o);
  };
  const selectTab = (t: PanelTab) => {
    setTab(t);
    if (narrow && sheet === "peek") setSheet("half");
  };

  return (
    /* negative margins mirror the AppShell main padding (px-4 py-6 sm:px-6
       lg:px-8 lg:py-8) so the room bleeds edge-to-edge at every breakpoint */
    <div className="relative -mx-4 -my-6 h-[calc(100dvh-4rem)] min-h-[540px] overflow-hidden p-2.5 sm:-mx-6 lg:-mx-8 lg:-my-8 min-[960px]:px-6 min-[960px]:pb-5 min-[960px]:pt-3">
      <div
        data-panel={desktopOpen ? "open" : "closed"}
        className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-3.5 [--pw:392px] max-[1240px]:[--pw:352px] data-[panel=closed]:[--pw:68px] min-[960px]:grid-cols-[minmax(0,1fr)_var(--pw)] motion-safe:min-[960px]:transition-[grid-template-columns] motion-safe:min-[960px]:duration-300"
      >
        {/* ================= stage ================= */}
        <section
          aria-label="Meeting stage"
          className="relative flex min-h-0 min-w-0 flex-col gap-2 rounded-card bg-[image:var(--wash)] p-2.5 min-[960px]:gap-3 min-[960px]:p-3.5"
        >
          {/* top bar: title, live state, people, clock, layout */}
          <div className="flex min-h-[44px] items-center gap-2.5">
            <h2 className="display min-w-0 flex-1 truncate text-[17px] text-ink-display min-[960px]:text-[21px]">
              {meeting.title}
            </h2>
            <div className="flex shrink-0 items-center gap-2 max-[420px]:gap-1.5">
              <span className={`${PILL} text-priority-high`}>
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full bg-priority-high motion-safe:animate-pulse"
                />
                Live
              </span>
              <span className={`${PILL} max-[959px]:hidden`}>
                <Users size={16} className="text-ink-3" aria-hidden />
                {people.length}
                <span className="hidden text-ink-3 min-[1400px]:inline">in call</span>
              </span>
              <span className={PILL}>
                <Clock size={16} className="text-ink-3 max-[959px]:hidden" aria-hidden />
                <RoomClock />
              </span>
              <div
                role="group"
                aria-label="Stage layout"
                className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-[3px] shadow-sm max-[959px]:gap-1.5 max-[959px]:border-0 max-[959px]:bg-transparent max-[959px]:p-0 max-[959px]:shadow-none"
              >
                <LayoutButton
                  label="Spotlight layout"
                  text="Spotlight"
                  active={layout === "spotlight"}
                  onClick={() => setLayout("spotlight")}
                >
                  <Layout size={16} aria-hidden />
                </LayoutButton>
                <LayoutButton
                  label="Grid layout"
                  text="Grid"
                  active={layout === "grid"}
                  onClick={() => setLayout("grid")}
                >
                  <SquaresFour size={16} aria-hidden />
                </LayoutButton>
              </div>
              <Link
                href={`/meetings/${meeting.id}`}
                className={`${PILL} hidden transition-colors duration-150 hover:border-line-2 hover:bg-bg-2 focus-visible:!rounded-full active:scale-[0.97] min-[1400px]:inline-flex`}
              >
                <Info size={16} className="text-ink-3" aria-hidden />
                Meeting details
              </Link>
            </div>
          </div>

          {/* video grid - live LiveKit tracks once a room is actually connected, otherwise the
              mock composition. `live.status` is "unconfigured" in every environment that
              exists today, because no LiveKit account exists anywhere in the program yet, so the
              mock is what renders and the room keeps working exactly as it did. Gating on
              `connected` rather than merely "configured" also means a failed mint or a dropped
              SFU degrades to the mock instead of an empty stage. */}
          {liveRoom ? (
            <LiveVideoGrid
              room={liveRoom}
              layout={layout}
              spotlightId={spotlightId}
              onSpotlight={spotlight}
            />
          ) : (
            <RoomGrid
              tiles={mockTiles}
              layout={layout}
              spotlightId={spotlightId}
              onSpotlight={spotlight}
            />
          )}

          {/* live captions - the real `caption` socket stream once the gateway is reachable and
              this socket has joined the room, otherwise the mock strip. Gated on `joined` rather
              than merely "configured" for the same reason the video grid gates on `connected`: a
              denied participant check or a dropped gateway should degrade to the mock, not to an
              empty panel that looks like nobody is speaking. */}
          {captionsOn &&
            (socket.status === "joined" ? (
              <LiveCaptions lines={socket.captions.lines} />
            ) : (
              <CaptionFrame>
                {mockCaptions.map((c) => (
                  <CaptionText
                    key={c.text}
                    speaker={c.speaker.split(" ")[0]}
                    colorIndex={speakerColorIndex(c.speaker, 6)}
                  >
                    {c.text}
                  </CaptionText>
                ))}
              </CaptionFrame>
            ))}

          {/* keeps the controls clear of the peeking sheet on a phone */}
          <div aria-hidden className="h-[72px] shrink-0 min-[960px]:hidden" />

          <ControlBar
            micOn={micOn}
            camOn={camOn}
            captionsOn={captionsOn}
            panelOpen={panelPressed}
            attention={attention.count}
            leaveHref={`/meetings/${meeting.id}`}
            onMic={() => setMicOn((v) => !v)}
            onCam={() => setCamOn((v) => !v)}
            onCaptions={() => setCaptionsOn((v) => !v)}
            onPanel={togglePanel}
          />
        </section>

        {/* ================= panel ================= */}
        <RoomPanel
          tab={tab}
          onTab={(t) => {
            if (!narrow) setDesktopOpen(true);
            selectTab(t);
          }}
          desktopOpen={desktopOpen}
          onDesktopOpen={setDesktopOpen}
          sheet={sheet}
          onSheet={setSheet}
          narrow={narrow}
          attention={attention.count}
          conflict={attention.conflict}
          peopleCount={people.length}
          agent={<AgentSidebar onAttentionChange={onAttention} />}
          chat={<ChatPanel />}
          people={<PeoplePanel people={people} />}
        />
      </div>
    </div>
  );
}

/* One half of the Spotlight / Grid switch. On a phone only the layout you are NOT in is shown, as
   a round button, which saves the room for the video. */
function LayoutButton({
  label,
  text,
  active,
  onClick,
  children,
}: {
  label: string;
  text: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-[30px] items-center justify-center gap-1.5 rounded-full px-2.5 text-[13px] font-semibold transition-[background-color,color,transform] duration-150 focus-visible:!rounded-full active:scale-95 motion-reduce:transition-none ${
        active
          ? "bg-pill text-white max-[959px]:hidden"
          : "text-ink-3 hover:bg-bg-2 hover:text-ink max-[959px]:h-9 max-[959px]:w-9 max-[959px]:border max-[959px]:border-line max-[959px]:bg-surface max-[959px]:px-0 max-[959px]:text-ink-2 max-[959px]:shadow-sm"
      }`}
    >
      {children}
      <span className="hidden min-[1400px]:inline">{text}</span>
    </button>
  );
}
