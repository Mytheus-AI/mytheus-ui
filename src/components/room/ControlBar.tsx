"use client";

import Link from "next/link";
import {
  ClosedCaptioning,
  Microphone,
  MicrophoneSlash,
  PhoneDisconnect,
  SquaresFour,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";

/* The design's dark control pill, floating at the bottom of the video frame. It keeps the controls
   the app can honour: mic, camera, captions, the layout switch, and Leave. The design's share
   screen, record and raise-hand buttons are left out because nothing behind them exists yet.
   Shortcuts (M, V, C, L) are bound in MeetingRoom and named in the tooltips. */

export function ControlBar({
  micOn,
  camOn,
  captionsOn,
  gridOn,
  leaveHref,
  onMic,
  onCam,
  onCaptions,
  onLayout,
}: {
  micOn: boolean;
  camOn: boolean;
  captionsOn: boolean;
  gridOn: boolean;
  leaveHref: string;
  onMic: () => void;
  onCam: () => void;
  onCaptions: () => void;
  onLayout: () => void;
}) {
  return (
    <div className="controls" role="toolbar" aria-label="Call controls">
      <button
        type="button"
        className={`ctl tap${micOn ? "" : " is-off"}`}
        data-tip={micOn ? "Mute · M" : "Unmute · M"}
        aria-label="Microphone"
        aria-pressed={micOn}
        onClick={onMic}
      >
        {micOn ? <Microphone size={17} aria-hidden /> : <MicrophoneSlash size={17} aria-hidden />}
      </button>
      <button
        type="button"
        className={`ctl tap${camOn ? "" : " is-off"}`}
        data-tip={camOn ? "Camera off · V" : "Camera on · V"}
        aria-label="Camera"
        aria-pressed={camOn}
        onClick={onCam}
      >
        {camOn ? <VideoCamera size={18} aria-hidden /> : <VideoCameraSlash size={18} aria-hidden />}
      </button>

      <span className="ctl-sep" aria-hidden="true"></span>

      <button
        type="button"
        className={`ctl tap${captionsOn ? " is-active" : ""}`}
        data-tip={captionsOn ? "Hide captions · C" : "Show captions · C"}
        aria-label="Live captions"
        aria-pressed={captionsOn}
        onClick={onCaptions}
      >
        <ClosedCaptioning size={18} weight={captionsOn ? "fill" : "regular"} aria-hidden />
      </button>
      <button
        type="button"
        className={`ctl tap${gridOn ? " is-active" : ""}`}
        data-tip={gridOn ? "Speaker view · L" : "Grid view · L"}
        aria-label="Grid view"
        aria-pressed={gridOn}
        onClick={onLayout}
      >
        <SquaresFour size={18} weight={gridOn ? "fill" : "regular"} aria-hidden />
      </button>

      <Link href={leaveHref} className="ctl-leave tap" aria-label="Leave meeting">
        <PhoneDisconnect size={17} weight="fill" aria-hidden />
        <span className="ctl-leave-label">Leave</span>
      </Link>
    </div>
  );
}
