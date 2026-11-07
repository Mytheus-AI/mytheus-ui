"use client";

import Link from "next/link";
import {
  ClosedCaptioning,
  Microphone,
  MicrophoneSlash,
  MonitorArrowUp,
  PhoneDisconnect,
  SquaresFour,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";

/* The design's dark control pill, floating at the bottom of the video frame. It keeps the controls
   the app can honour: mic, camera, screen share (only while a real LiveKit call is connected),
   captions, the layout switch, and Leave. Record and raise hand are left out because nothing
   behind them exists yet.
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
  screenOn = false,
  onScreen,
}: {
  micOn: boolean;
  camOn: boolean;
  captionsOn: boolean;
  gridOn: boolean;
  leaveHref: string;
  onMic: () => void;
  onCam: () => void;
  /** Absent when there are no captions to show, so the button never does nothing. */
  onCaptions?: () => void;
  onLayout: () => void;
  /** Present only when a real call is connected, so the button never does nothing. */
  screenOn?: boolean;
  onScreen?: () => void;
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
      {onScreen ? (
        <button
          type="button"
          className={`ctl tap${screenOn ? " is-active" : ""}`}
          data-tip={screenOn ? "Stop sharing" : "Share screen"}
          aria-label="Share screen"
          aria-pressed={screenOn}
          onClick={onScreen}
        >
          <MonitorArrowUp size={18} weight={screenOn ? "fill" : "regular"} aria-hidden />
        </button>
      ) : null}

      <span className="ctl-sep" aria-hidden="true"></span>

      {onCaptions ? (
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
      ) : null}
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
