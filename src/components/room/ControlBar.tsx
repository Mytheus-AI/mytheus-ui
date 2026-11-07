"use client";

import Link from "next/link";
import {
  ClosedCaptioning,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  Sparkle,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";

/* The dark pill control bar. It is a dark pill in both themes (it floats over video), so its few
   colours are fixed rather than tokenised: #262625 pill, #a8472a for "off" and the count dot, #b3402e
   for Leave, all of which hold AA against white. Every button has hover, focus-visible and active
   states; the global focus ring is a coral outline, offset so it clears the pill. */

const BTN =
  "relative grid h-10 w-10 place-items-center rounded-full bg-white/[0.12] text-[#f3f0e8] transition-[background-color,transform] duration-150 hover:bg-white/[0.22] focus-visible:!rounded-full focus-visible:outline-offset-[3px] active:scale-[0.93] motion-reduce:transition-none min-[960px]:h-11 min-[960px]:w-11";
const OFF = "!bg-[#a8472a] !text-white hover:!bg-[#b9502f]";
const ON = "!bg-[#c15f3c]/60 !text-white hover:!bg-[#c15f3c]/75";

export function ControlBar({
  micOn,
  camOn,
  captionsOn,
  panelOpen,
  attention,
  leaveHref,
  onMic,
  onCam,
  onCaptions,
  onPanel,
}: {
  micOn: boolean;
  camOn: boolean;
  captionsOn: boolean;
  panelOpen: boolean;
  /** Items the agent wants a decision on; shown as a count on the agent button. */
  attention: number;
  leaveHref: string;
  onMic: () => void;
  onCam: () => void;
  onCaptions: () => void;
  onPanel: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Call controls"
      className="flex h-[60px] shrink-0 items-center gap-1.5 self-center rounded-full bg-[#262625] p-2 max-[959px]:relative max-[959px]:z-30 shadow-[0_10px_30px_-8px_rgba(26,24,22,0.55)] ring-1 ring-white/10 max-[959px]:gap-[3px] max-[959px]:px-[7px]"
    >
      <button
        type="button"
        onClick={onMic}
        aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        title={micOn ? "Mute microphone" : "Unmute microphone"}
        className={`${BTN} ${micOn ? "" : OFF}`}
      >
        {micOn ? <Microphone size={20} aria-hidden /> : <MicrophoneSlash size={20} aria-hidden />}
      </button>

      <button
        type="button"
        onClick={onCam}
        aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        title={camOn ? "Turn camera off" : "Turn camera on"}
        className={`${BTN} ${camOn ? "" : OFF}`}
      >
        {camOn ? <VideoCamera size={20} aria-hidden /> : <VideoCameraSlash size={20} aria-hidden />}
      </button>

      <button
        type="button"
        onClick={onCaptions}
        aria-label="Live captions"
        aria-pressed={captionsOn}
        title={captionsOn ? "Hide live captions" : "Show live captions"}
        className={`${BTN} ${captionsOn ? ON : ""}`}
      >
        <ClosedCaptioning size={20} weight={captionsOn ? "fill" : "regular"} aria-hidden />
      </button>

      <span aria-hidden className="mx-1 h-[26px] w-px bg-white/20 max-[959px]:mx-px" />

      <button
        type="button"
        onClick={onPanel}
        aria-label={attention > 0 ? `Agent panel, ${attention} need you` : "Agent panel"}
        aria-pressed={panelOpen}
        title="Agent panel"
        className={`${BTN} ${panelOpen ? ON : ""}`}
      >
        <Sparkle size={20} weight={panelOpen ? "fill" : "regular"} aria-hidden />
        {attention > 0 ? (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-[#262625] bg-[#a8472a] px-1 text-[10.5px] font-extrabold leading-none text-white max-[959px]:right-[-2px] max-[959px]:top-[-2px]"
          >
            {attention}
          </span>
        ) : null}
      </button>

      <Link
        href={leaveHref}
        aria-label="Leave meeting"
        title="Leave meeting"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#b3402e] px-[18px] text-[13.5px] font-bold text-white transition-[filter,transform] duration-150 hover:brightness-110 focus-visible:!rounded-full focus-visible:outline-offset-[3px] active:scale-[0.96] motion-reduce:transition-none max-[959px]:w-10 max-[959px]:px-0 min-[960px]:h-11"
      >
        <PhoneDisconnect size={18} weight="fill" aria-hidden />
        <span className="max-[959px]:hidden">Leave</span>
      </Link>
    </div>
  );
}
