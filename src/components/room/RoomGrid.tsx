"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowsOutSimple, MicrophoneSlash } from "@phosphor-icons/react";

/* The participant stage, shared by the mock grid and the live LiveKit grid so swapping between
   them is not also a visual change. Each tile is plain data (`RoomTile`); the live grid passes a
   <VideoTrack> as `media`, the mock grid passes nothing and gets the lit-room wash.

   Layouts:
   - grid: 6-column track on desktop (2 up, 3 up, 2x2, 3+2, 3x3 ...), 2 columns on a phone.
   - spotlight: one large tile plus a column (desktop) or strip (phone) of the others.

   Video tiles are always dark scrims and white tags in both themes, because they sit on top of
   moving imagery. Their few fixed colours are noted inline; everything else reads the tokens. */

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

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ---- grid layout classes (literal strings so Tailwind can see them) ---- */

function gridContainerClass(n: number): string {
  const base = "grid-cols-2 auto-rows-[minmax(110px,1fr)]";
  switch (n) {
    case 1:
      return "grid-cols-1 auto-rows-[minmax(110px,1fr)] min-[960px]:grid-cols-1 min-[960px]:grid-rows-1";
    case 2:
      return `${base} min-[960px]:grid-cols-2 min-[960px]:grid-rows-1`;
    case 3:
      return `${base} min-[960px]:grid-cols-6 min-[960px]:grid-rows-1`;
    case 4:
      return `${base} min-[960px]:grid-cols-6 min-[960px]:grid-rows-2 min-[1500px]:grid-cols-4 min-[1500px]:grid-rows-1`;
    case 5:
    case 6:
      return `${base} min-[960px]:grid-cols-6 min-[960px]:grid-rows-2`;
    default:
      return `${base} min-[960px]:grid-cols-6 min-[960px]:auto-rows-[minmax(170px,1fr)]`;
  }
}

function gridTileClass(n: number, index: number): string {
  // On a phone the last tile of an odd set spans both columns so no hole is left.
  const mobile = n > 1 && n % 2 === 1 && index === n - 1 ? "col-span-2 " : "";
  switch (n) {
    case 1:
    case 2:
      return mobile;
    case 4:
      return `${mobile}min-[960px]:col-span-3 min-[1500px]:col-span-1`;
    case 5:
      return `${mobile}min-[960px]:col-span-2 ${index === 3 ? "min-[960px]:col-start-2" : ""}`;
    default:
      return `${mobile}min-[960px]:col-span-2`;
  }
}

const SPOT_CONTAINER =
  "grid-cols-[repeat(var(--side),minmax(0,1fr))] grid-rows-[minmax(0,1fr)_84px] min-[960px]:grid-cols-[minmax(0,1fr)_clamp(150px,22%,210px)] min-[960px]:grid-rows-[repeat(var(--side),minmax(0,1fr))]";
const SPOT_MAIN =
  "col-[1/-1] row-start-1 min-[960px]:col-[1/2] min-[960px]:row-[1/span_var(--side)]";
const SPOT_SIDE = "row-start-2 min-[960px]:col-start-2 min-[960px]:row-auto";

export function RoomGrid({
  tiles,
  layout,
  spotlightId,
  onSpotlight,
}: {
  tiles: RoomTile[];
  layout: RoomLayout;
  spotlightId?: string | null;
  onSpotlight?: (id: string) => void;
}) {
  const n = tiles.length;
  const spot = layout === "spotlight" && n > 1;
  const main = spot
    ? (tiles.find((t) => t.id === spotlightId) ??
      tiles.find((t) => t.kind === "screen") ??
      tiles.find((t) => t.speaking) ??
      tiles[0])
    : null;

  if (n === 0) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center rounded-card border border-dashed border-line-2 text-[14px] text-ink-3">
        Waiting for people to join.
      </div>
    );
  }

  if (spot && main) {
    const side = Math.max(1, n - 1);
    return (
      <div
        role="group"
        aria-label="Participants"
        style={{ "--side": side } as CSSProperties}
        className={`grid min-h-0 flex-1 gap-2.5 overflow-hidden p-2 ${SPOT_CONTAINER}`}
      >
        {tiles.map((t) => {
          const isMain = t.id === main.id;
          return (
            <Tile
              key={t.id}
              tile={t}
              compact={!isMain}
              className={isMain ? SPOT_MAIN : SPOT_SIDE}
              onSpotlight={isMain ? undefined : onSpotlight}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Participants"
      className={`grid min-h-0 flex-1 gap-2.5 overflow-y-auto p-2 ${gridContainerClass(n)}`}
    >
      {tiles.map((t, i) => (
        <Tile
          key={t.id}
          tile={t}
          className={gridTileClass(n, i)}
          onSpotlight={n > 1 ? onSpotlight : undefined}
        />
      ))}
    </div>
  );
}

function Tile({
  tile,
  compact = false,
  className = "",
  onSpotlight,
}: {
  tile: RoomTile;
  compact?: boolean;
  className?: string;
  onSpotlight?: (id: string) => void;
}) {
  const screen = tile.kind === "screen";
  const showMedia = Boolean(tile.media) && tile.camOn;
  const muted = !screen && !tile.micOn;
  const speaking = Boolean(tile.speaking) && !muted;

  // Dark when there is no picture to show; black behind real video; a warm lit room for the mock.
  const surface = showMedia
    ? "bg-black"
    : tile.camOn
      ? "bg-bg-3"
      : "bg-gradient-to-br from-[#2b2826] to-[#1a1816]";

  const label = [
    tile.name,
    tile.isLocal ? "you" : null,
    muted ? "muted" : null,
    speaking ? "speaking" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <figure
      aria-label={label}
      className={`group relative isolate min-h-0 min-w-0 overflow-hidden rounded-pill transition-shadow duration-200 motion-reduce:transition-none min-[960px]:rounded-card ${surface} ${
        speaking
          ? "shadow-[0_0_0_3px_var(--signal),0_0_0_8px_color-mix(in_srgb,var(--signal)_26%,transparent)]"
          : ""
      } ${className}`}
    >
      {showMedia ? (
        tile.media
      ) : screen ? null : (
        <>
          {tile.camOn ? (
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(80%_90%_at_50%_30%,rgba(217,119,87,0.3),transparent_70%)]"
            />
          ) : null}
          <div aria-hidden className="absolute inset-0 grid place-items-center">
            {/* fixed deep coral so the white initials hold AA in both themes */}
            <span
              className={`grid place-items-center rounded-full bg-[#a8472a] font-bold text-white ${
                compact
                  ? "h-11 w-11 text-[16px] min-[960px]:h-14 min-[960px]:w-14 min-[960px]:text-[20px]"
                  : "h-14 w-14 text-[20px] min-[960px]:h-20 min-[960px]:w-20 min-[960px]:text-[28px]"
              }`}
            >
              {initials(tile.name)}
            </span>
          </div>
        </>
      )}

      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/2 bg-gradient-to-t from-black/30 to-transparent"
      />

      {onSpotlight ? (
        <button
          type="button"
          onClick={() => onSpotlight(tile.id)}
          aria-label={`Spotlight ${tile.name}`}
          title="Spotlight"
          className={`absolute left-2.5 top-2.5 z-20 grid h-[30px] w-[30px] place-items-center rounded-full bg-[rgba(26,24,22,0.78)] text-white opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-150 hover:bg-[rgba(26,24,22,0.92)] focus-visible:!rounded-full focus-visible:opacity-100 active:scale-90 group-hover:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-90 ${
            compact ? "max-[959px]:hidden" : ""
          }`}
        >
          <ArrowsOutSimple size={15} aria-hidden />
        </button>
      ) : null}

      {muted ? (
        <span
          aria-hidden
          className={`absolute right-2.5 top-2.5 z-10 grid place-items-center rounded-full bg-[#a8472a] text-white ${
            compact ? "h-6 w-6" : "h-[30px] w-[30px]"
          }`}
        >
          <MicrophoneSlash size={compact ? 12 : 15} weight="fill" />
        </span>
      ) : null}

      <figcaption
        className={`absolute z-10 inline-flex max-w-[calc(100%-52px)] items-center gap-2 rounded-full bg-[rgba(26,24,22,0.78)] font-semibold text-white backdrop-blur-sm ${
          compact
            ? "bottom-2 left-2 h-[26px] px-2.5 text-[12px] max-[959px]:bottom-1.5 max-[959px]:left-1.5 max-[959px]:h-[22px] max-[959px]:max-w-[calc(100%-12px)] max-[959px]:px-2 max-[959px]:text-[11px]"
            : "bottom-2.5 left-2.5 h-[30px] pl-2.5 pr-3 text-[12.5px]"
        }`}
      >
        {speaking ? <Wave /> : null}
        <span className="truncate">{compact ? tile.name.split(" ")[0] : tile.name}</span>
        {tile.isLocal && !compact ? (
          <span className="shrink-0 text-[11.5px] font-medium text-white/75">You</span>
        ) : null}
        {!compact && tile.role && !tile.isLocal ? (
          <span className="hidden shrink-0 text-[11.5px] font-medium text-white/75 sm:inline">
            {tile.role}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}

/* Four bars that breathe while someone speaks; static under reduced motion. */
function Wave() {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden className="flex h-[13px] shrink-0 items-end gap-[2px] max-[959px]:hidden">
      {[0.45, 1, 0.62, 0.85].map((h, i) => (
        <motion.i
          key={i}
          className="block w-[3px] origin-bottom rounded-sm bg-signal-bright"
          style={{ height: `${h * 100}%` }}
          animate={reduce ? undefined : { scaleY: [1, 0.3, 1] }}
          transition={{ duration: 0.85, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}
