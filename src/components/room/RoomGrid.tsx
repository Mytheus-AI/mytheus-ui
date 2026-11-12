"use client";

import { useId, type CSSProperties, type ReactNode } from "react";
import { HandPalm, MicrophoneSlash, Microphone, PushPin, UsersThree } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { useSpotlight } from "@/components/room/useSpotlight";
import { ordinal } from "@/lib/realtime/room-live";

/* The meeting stage, shared by your own pre-connect tile and the live LiveKit tiles so connecting
   is not also a visual change. Each tile is plain data (`RoomTile`); the live grid passes a
   <VideoTrack> as `media`. A tile without media shows the person's tint with their initials in
   the display serif, the same faces as the marketing room window.

   Layouts:
   - spotlight: one large frame for the pinned person, else whoever shares a screen, else whoever
     holds the floor (`spotlightId`: a new speaker must speak for about 1.5 s before the frame
     moves to them, so a cough or a one-word answer does not jump the stage; see
     lib/realtime/spotlight.ts), with up to three thumbnails beside it (a strip on a phone) and a
     "+N" button that opens the grid when there are more.

   A raised hand shows as an amber badge with the person's place in the queue on their tile (and
   in the People tab and the stage's Hands raised list, in order).
   - grid: everyone as equal tiles inside the same frame.

   `overlay` is drawn inside the frame on top of the video: the clock, captions and controls.

   ADR-0039 B5: someone who sent their agent instead of coming appears as an agent tile: the
   agent's face where the camera would be, "Attending for {name}", and their update revealed on
   hover or keyboard focus (the tile is focusable, and the update is its description for screen
   readers). An agent tile never takes the spotlight from a person. */

export type RoomLayout = "grid" | "spotlight";

export type RoomTile = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
  camOn: boolean;
  speaking?: boolean;
  /** "screen" tiles are shared screens: contained, no avatar, no mute badge. "proxy" tiles are
      the agent of someone who sent it instead of coming (ADR-0039 B5). */
  kind?: "camera" | "screen" | "proxy";
  /** Live media (a <VideoTrack>), absolutely positioned by the caller. */
  media?: ReactNode;
  /** Profile photo for the camera-off avatar; initials when absent. */
  imageUrl?: string;
  /** This person's agent (ADR-0038 D11): a small badge of its face, named for screen readers. */
  agent?: { name: string; seed: string };
  /** A proxy tile's person and the update they gave their Myte for the room, and opening the
   *  stand-in (their whole update and "Ask their Myte"). */
  proxy?: { forName: string; update: string | null; onOpen?: () => void };
  /** This person's hand is up. */
  handUp?: boolean;
  /** Their place in the hands queue, from 1 (0 or absent when the hand is down). */
  handPlace?: number;
};

/* A raised hand on a tile: the hand and the person's place in the queue, in amber. */
function HandBadge({ tile, className }: { tile: RoomTile; className: string }) {
  if (!tile.handUp) return null;
  return (
    <span className={className} aria-hidden="true">
      <HandPalm size={14} weight="fill" />
      {tile.handPlace ? <span className="hand-n">{tile.handPlace}</span> : null}
    </span>
  );
}

function handWords(tile: RoomTile): string | null {
  if (!tile.handUp) return null;
  return tile.handPlace ? `hand raised, ${ordinal(tile.handPlace)} in line` : "hand raised";
}

/* A participant's Myte, as a small plush badge in their name tag. Its accessible name says whose
   agent it is. */
function AgentBadge({ agent }: { agent?: RoomTile["agent"] }) {
  if (!agent) return null;
  return (
    <span className="cx-agent-badge" role="img" aria-label={`Agent: ${agent.name}`} title={agent.name}>
      <AgentOrb seed={agent.seed} size={22} />
    </span>
  );
}

const MAX_THUMBS = 3;

/** The person behind a tile, without the `:camera` / `:screen` suffix, so their tint is stable. */
function personKey(tile: RoomTile): string {
  return tile.id.split(":")[0] ?? tile.id;
}

export function pickMain(
  tiles: RoomTile[],
  pinnedId: string | null | undefined,
  spotlightId?: string | null,
): RoomTile | undefined {
  return (
    tiles.find((t) => t.id === pinnedId) ??
    tiles.find((t) => t.kind === "screen") ??
    tiles.find((t) => t.id === spotlightId && !t.isLocal && t.kind !== "proxy") ??
    tiles.find((t) => !t.isLocal && t.kind !== "proxy") ??
    tiles.find((t) => t.kind !== "proxy") ??
    tiles[0]
  );
}

function gridCols(n: number) {
  if (n <= 1) return 1;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

export function RoomGrid({
  tiles,
  layout,
  pinnedId,
  spotlightId = null,
  onPin,
  onShowAll,
  overlay,
}: {
  tiles: RoomTile[];
  layout: RoomLayout;
  pinnedId?: string | null;
  /** Who holds the floor (held for about 1.5 s), from `stepSpotlight`. */
  spotlightId?: string | null;
  /** Pin (or, with null, unpin) a participant to the main frame. */
  onPin?: (id: string | null) => void;
  /** Opens the grid; used by the "+N" button when not everyone fits beside the main frame. */
  onShowAll?: () => void;
  overlay?: ReactNode;
}) {
  const n = tiles.length;
  const spot = layout === "spotlight" || n <= 1;
  const main = spot ? pickMain(tiles, pinnedId, spotlightId) : undefined;
  const others = main ? tiles.filter((t) => t.id !== main.id) : [];
  const thumbs = others.slice(0, MAX_THUMBS);
  const hidden = others.length - thumbs.length;
  const mainSpeaking = Boolean(main?.speaking && main.micOn && main.kind !== "screen");

  return (
    <section className="stage" aria-label="Meeting stage">
      <div
        className={`main-video ${main ? toneOf(personKey(main)) : ""}`}
        role="group"
        aria-label={main ? `${main.name}${mainSpeaking ? ", speaking" : ""}` : "Participants"}
      >
        {n === 0 ? (
          <div className="cx-waiting">Waiting for people to join.</div>
        ) : main?.kind === "proxy" ? (
          <ProxyBody tile={main} large />
        ) : main ? (
          <>
            <TileSurface tile={main} />
            <span className="name-pill">
              {mainSpeaking ? <Wave /> : null}
              {!main.micOn && main.kind !== "screen" ? (
                <MicrophoneSlash size={14} weight="fill" className="cx-muted" aria-label="Muted" role="img" />
              ) : null}
              {main.kind !== "screen" ? <AgentBadge agent={main.agent} /> : null}
              {main.isLocal ? `${main.name} (you)` : main.name}
              {main.handUp ? (
                <span className="cx-hand" role="img" aria-label={handWords(main) ?? "Hand raised"}>
                  <HandPalm size={15} weight="fill" aria-hidden />
                  {main.handPlace ? <span className="hand-n">{main.handPlace}</span> : null}
                </span>
              ) : null}
              {mainSpeaking ? <small>Speaking</small> : null}
            </span>
          </>
        ) : (
          <div
            className={`cx-grid${n === 1 ? " is-solo" : ""}`}
            style={{ "--cols": gridCols(n), "--rows": Math.ceil(n / gridCols(n)) } as CSSProperties}
            role="group"
            aria-label="Participants"
          >
            {tiles.map((t) =>
              t.kind === "proxy" ? (
                <ProxyThumb key={t.id} tile={t} />
              ) : (
                <Thumb key={t.id} tile={t} pinLabel="Spotlight" onPin={onPin ? () => onPin(t.id) : undefined} />
              ),
            )}
          </div>
        )}

        {overlay}
      </div>

      {spot && (thumbs.length > 0 || (pinnedId && main?.id === pinnedId)) ? (
        <div className="thumbs" aria-label="Participant videos">
          {thumbs.map((t) =>
            t.kind === "proxy" ? (
              <ProxyThumb key={t.id} tile={t} />
            ) : (
              <Thumb key={t.id} tile={t} pinLabel="Pin" onPin={onPin ? () => onPin(t.id) : undefined} />
            ),
          )}
          {hidden > 0 ? (
            <button
              type="button"
              className="more-pill tap"
              aria-label={`Show all ${n} participants`}
              data-tip="Show everyone"
              onClick={onShowAll}
            >
              <UsersThree size={18} aria-hidden />
              {hidden} more
            </button>
          ) : null}
          {pinnedId && main?.id === pinnedId && onPin ? (
            <button type="button" className="more-pill tap" aria-label={`Unpin ${main.name}`} onClick={() => onPin(null)}>
              <PushPin size={16} weight="fill" aria-hidden />
              Unpin
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function TileSurface({ tile }: { tile: RoomTile }) {
  const showMedia = Boolean(tile.media) && tile.camOn;
  if (showMedia) {
    return (
      <>
        <span className="cx-tile-bg is-media" aria-hidden />
        {tile.media}
      </>
    );
  }
  if (tile.kind === "screen") return <span className="cx-tile-bg is-screen" aria-hidden />;
  return (
    <>
      <span className="cx-tile-bg" aria-hidden />
      <span className="cx-initials" aria-hidden>
        {tile.imageUrl ? (
          // A profile photo from Clerk's CDN; a plain <img> keeps it out of next/image's domain list.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tile.imageUrl} alt="" referrerPolicy="no-referrer" />
        ) : (
          initials(tile.name)
        )}
      </span>
    </>
  );
}

function Thumb({ tile, pinLabel, onPin }: { tile: RoomTile; pinLabel: string; onPin?: () => void }) {
  const screen = tile.kind === "screen";
  const speaking = Boolean(tile.speaking) && tile.micOn && !screen;
  const label = [tile.name, tile.isLocal ? "you" : null, !tile.micOn && !screen ? "muted" : null, speaking ? "speaking" : null, handWords(tile)]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={`thumb ${toneOf(personKey(tile))}${speaking ? " is-speaking" : ""}${tile.handUp ? " has-hand" : ""}`} role="group" aria-label={label}>
      <TileSurface tile={tile} />
      {onPin ? (
        <button type="button" className="thumb-pin tap tip-below tip-end" data-tip={pinLabel} aria-label={`${pinLabel} ${tile.name}`} onClick={onPin}>
          <PushPin size={15} aria-hidden />
        </button>
      ) : null}
      <HandBadge tile={tile} className="thumb-hand" />
      <span className="thumb-name">
        {speaking ? <Wave /> : null}
        {screen ? null : <AgentBadge agent={tile.agent} />}
        {tile.isLocal ? "You" : tile.name.split(" ")[0]}
      </span>
      {screen ? null : (
        <span className={`thumb-mic is-${tile.micOn ? "on" : "muted"}`} aria-hidden>
          {tile.micOn ? <Microphone size={13} /> : <MicrophoneSlash size={13} weight="fill" />}
        </span>
      )}
    </div>
  );
}

/* An agent attending for someone (polish program, Phase 1: the update is ON the tile, not behind
   a hover): its face, whose agent it is, the update they sent with it, and "Ask <name>'s Myte",
   which opens the stand-in with the whole update and the permission-gated ask. On a tile too
   small to read (a thumbnail), the text gives way to the button alone. */
function ProxyBody({ tile, large = false }: { tile: RoomTile; large?: boolean }) {
  const uid = useId();
  const forName = tile.proxy?.forName ?? "someone";
  const first = forName.split(" ")[0] || forName;
  const update = tile.proxy?.update ?? null;
  const onOpen = tile.proxy?.onOpen;
  return (
    <div
      className={`cx-proxy is-open${large ? " is-large" : ""}`}
      role="group"
      aria-label={`${tile.agent?.name ?? "A Myte"}, standing in for ${forName}`}
      aria-describedby={`${uid}-u`}
    >
      <span className="cx-tile-bg is-proxy" aria-hidden />
      <div className="cx-proxy-card">
        <span className="cx-proxy-face" aria-hidden>
          {tile.agent ? <AgentOrb seed={tile.agent.seed} mode="live" size={132} /> : null}
        </span>
        <p className="cx-proxy-for">Standing in for {forName}</p>
        <p id={`${uid}-u`} className={`cx-proxy-text${update ? "" : " is-empty"}`}>
          <span className="sr-only">{forName}&rsquo;s update: </span>
          {update ?? "No update left. Their Myte listens and takes notes for them."}
        </p>
        {onOpen ? (
          <button type="button" className="cx-proxy-ask tap" onClick={onOpen} aria-label={`Ask ${forName}'s Myte, and read the whole update`}>
            Ask {first}&rsquo;s Myte
          </button>
        ) : null}
      </div>
      <span className="thumb-name">{tile.agent?.name ?? `${forName}'s Myte`}</span>
    </div>
  );
}

function ProxyThumb({ tile }: { tile: RoomTile }) {
  return (
    <div className={`thumb is-proxy ${toneOf(personKey(tile))}`}>
      <ProxyBody tile={tile} />
    </div>
  );
}

/* Four bars that breathe while someone speaks. */
function Wave() {
  return (
    <span className="wave" aria-hidden="true">
      <i></i>
      <i></i>
      <i></i>
      <i></i>
    </span>
  );
}

/* The stage with a calm spotlight: RoomGrid plus `useSpotlight`, so the hook runs in a component
   (the live grid hands the tiles over through a render prop). */
export function SteadyRoomGrid(props: Omit<Parameters<typeof RoomGrid>[0], "spotlightId">) {
  const spotlightId = useSpotlight(props.tiles);
  return <RoomGrid {...props} spotlightId={spotlightId} />;
}
