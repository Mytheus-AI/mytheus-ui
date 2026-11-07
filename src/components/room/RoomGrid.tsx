"use client";

import type { CSSProperties, ReactNode } from "react";
import { MicrophoneSlash, Microphone, PushPin, UsersThree } from "@phosphor-icons/react";

/* The meeting stage, in the meeting design's shape, shared by your own pre-connect tile and the
   live LiveKit tiles so connecting is not also a visual change. Each tile is plain data
   (`RoomTile`); the live grid passes a <VideoTrack> as `media`, a tile without media gets a lit
   room (camera on) or a dark room (camera off) with initials.

   Layouts:
   - spotlight (the design): one large frame for the pinned person, else whoever shares a screen,
     else whoever is speaking, with up to three thumbnails beside it (a strip on a phone) and a
     "+N" pill that opens the grid when there are more.
   - grid: everyone as equal tiles inside the same frame.

   `overlay` is drawn inside the frame on top of the video: the timer, captions and controls. */

export type RoomLayout = "grid" | "spotlight";

export type RoomTile = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
  camOn: boolean;
  speaking?: boolean;
  /** "screen" tiles are shared screens: contained, no avatar, no mute badge. */
  kind?: "camera" | "screen";
  /** Live media (a <VideoTrack>), absolutely positioned by the caller. */
  media?: ReactNode;
};

const MAX_THUMBS = 3;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function pickMain(tiles: RoomTile[], pinnedId: string | null | undefined): RoomTile | undefined {
  return (
    tiles.find((t) => t.id === pinnedId) ??
    tiles.find((t) => t.kind === "screen") ??
    tiles.find((t) => t.speaking && !t.isLocal) ??
    tiles.find((t) => !t.isLocal) ??
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
  onPin,
  onShowAll,
  overlay,
}: {
  tiles: RoomTile[];
  layout: RoomLayout;
  pinnedId?: string | null;
  /** Pin (or, with null, unpin) a participant to the main frame. */
  onPin?: (id: string | null) => void;
  /** Opens the grid; used by the "+N" pill when not everyone fits beside the main frame. */
  onShowAll?: () => void;
  overlay?: ReactNode;
}) {
  const n = tiles.length;
  const spot = layout === "spotlight" || n <= 1;
  const main = spot ? pickMain(tiles, pinnedId) : undefined;
  const others = main ? tiles.filter((t) => t.id !== main.id) : [];
  const thumbs = others.slice(0, MAX_THUMBS);
  const hidden = others.length - thumbs.length;

  return (
    <section className="stage" aria-label="Meeting stage">
      <div
        className="main-video reveal"
        style={{ animationDelay: ".09s" }}
        role="group"
        aria-label={main ? `${main.name}${main.speaking ? ", speaking" : ""}` : "Participants"}
      >
        {n === 0 ? (
          <div className="cx-waiting">Waiting for people to join.</div>
        ) : main ? (
          <>
            <TileSurface tile={main} size="lg" />
            <span className="name-pill scrim-pill">
              {main.speaking && main.micOn ? <Wave /> : null}
              {!main.micOn && main.kind !== "screen" ? (
                <MicrophoneSlash size={13} weight="fill" className="cx-muted" aria-label="Muted" role="img" />
              ) : null}
              {main.isLocal ? `${main.name} (You)` : main.name}
              {main.speaking && main.micOn ? (
                <>
                  &nbsp;<small>· Speaking</small>
                </>
              ) : null}
            </span>
          </>
        ) : (
          <div
            className={`cx-grid${n === 1 ? " is-solo" : ""}`}
            style={{ "--cols": gridCols(n) } as CSSProperties}
            role="group"
            aria-label="Participants"
          >
            {tiles.map((t) => (
              <Thumb key={t.id} tile={t} pinned={false} pinLabel="Spotlight" onPin={onPin ? () => onPin(t.id) : undefined} />
            ))}
          </div>
        )}

        {overlay}
      </div>

      {spot && thumbs.length > 0 ? (
        <div className="thumbs" aria-label="Participant videos">
          {thumbs.map((t, i) => (
            <Thumb
              key={t.id}
              tile={t}
              className="reveal"
              style={{ animationDelay: `${0.18 + i * 0.09}s` }}
              pinned={false}
              pinLabel="Pin"
              onPin={onPin ? () => onPin(t.id) : undefined}
            />
          ))}
          {hidden > 0 ? (
            <button
              type="button"
              className="more-pill tap reveal"
              style={{ animationDelay: ".45s" }}
              aria-label={`Show all ${n} participants`}
              data-tip="Show everyone"
              onClick={onShowAll}
            >
              <UsersThree size={20} aria-hidden />
              <b>{hidden}+</b>
            </button>
          ) : null}
          {pinnedId && main?.id === pinnedId && onPin ? (
            <button
              type="button"
              className="more-pill tap"
              aria-label={`Unpin ${main.name}`}
              onClick={() => onPin(null)}
            >
              <PushPin size={16} weight="fill" aria-hidden />
              <b style={{ fontSize: 12.5 }}>Unpin</b>
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function TileSurface({ tile, size }: { tile: RoomTile; size: "lg" | "md" | "sm" }) {
  const showMedia = Boolean(tile.media) && tile.camOn;
  if (showMedia) {
    return (
      <>
        <span className="cx-tile-bg is-media" aria-hidden />
        {tile.media}
      </>
    );
  }
  if (tile.kind === "screen") return <span className="cx-tile-bg is-dark" aria-hidden />;
  return (
    <>
      <span className={`cx-tile-bg ${tile.camOn ? "is-lit" : "is-dark"}`} aria-hidden />
      <span className={`cx-initials${size === "lg" ? "" : ` is-${size}`}`} aria-hidden>
        {initials(tile.name)}
      </span>
    </>
  );
}

function Thumb({
  tile,
  pinned,
  pinLabel,
  onPin,
  className = "",
  style,
}: {
  tile: RoomTile;
  pinned: boolean;
  pinLabel: string;
  onPin?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const screen = tile.kind === "screen";
  const speaking = Boolean(tile.speaking) && tile.micOn && !screen;
  const label = [tile.name, tile.isLocal ? "you" : null, !tile.micOn && !screen ? "muted" : null, speaking ? "speaking" : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className={`thumb${speaking ? " is-speaking" : ""} ${className}`} style={style} role="group" aria-label={label}>
      <TileSurface tile={tile} size="sm" />
      {onPin ? (
        <button
          type="button"
          className={`thumb-pin tap${pinned ? " is-pinned" : ""}`}
          data-tip={pinLabel}
          aria-label={`${pinLabel} ${tile.name}`}
          onClick={onPin}
        >
          <PushPin size={13} aria-hidden />
        </button>
      ) : null}
      <span className="thumb-name scrim-pill">
        {speaking ? <Wave /> : null}
        {tile.isLocal ? "You" : tile.name.split(" ")[0]}
      </span>
      {screen ? null : (
        <span className={`thumb-mic is-${tile.micOn ? "on" : "muted"}`} aria-hidden>
          {tile.micOn ? <Microphone size={11} /> : <MicrophoneSlash size={11} weight="fill" />}
        </span>
      )}
    </div>
  );
}

/* Four bars that breathe while someone speaks (the design's wave). */
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
