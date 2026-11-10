"use client";

import Link from "next/link";
import type { Room } from "livekit-client";
import {
  ClosedCaptioning,
  DotsThree,
  GearSix,
  HandPalm,
  Microphone,
  MicrophoneSlash,
  MonitorArrowUp,
  PhoneDisconnect,
  Smiley,
  SquaresFour,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { Popover } from "@/components/room/Popover";
import { DeviceMenu } from "@/components/room/DeviceMenu";
import { REACTIONS, type ReactionId } from "@/lib/realtime/room-live";
import { SHORTCUTS } from "@/lib/realtime/shortcuts";

/* The dark control bar, floating at the bottom of the stage. It keeps only the controls the room
   can honour: mic, camera, screen share (while a real call is connected), raise hand and
   reactions (while the meeting link is joined), captions, devices, the layout switch, More
   (keyboard shortcuts, with an off switch), and Leave. Off (mic or camera muted) is red, an active
   toggle is inverted, Leave is the one strong button.

   The host (or the meeting's creator) gets a Leave menu: leave on your own, or End for everyone,
   which asks once more before it ends the meeting for the whole room.

   Shortcut letters appear in the tooltips only while shortcuts are on. */

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
  handUp = false,
  onHand,
  onReact,
  room = null,
  onDevicePicked,
  shortcutsOn,
  onShortcuts,
  onEndForEveryone,
  compact = false,
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
  screenOn?: boolean;
  /** Present only when a real call is connected. */
  onScreen?: () => void;
  handUp?: boolean;
  /** Present only while the meeting link is joined. */
  onHand?: () => void;
  onReact?: (reaction: ReactionId) => void;
  /** The connected call, for switching devices. */
  room?: Room | null;
  onDevicePicked?: (kind: "mic" | "cam", deviceId: string) => void;
  shortcutsOn: boolean;
  onShortcuts: (on: boolean) => void;
  /** Present only for the host or creator: opens the confirm step. */
  onEndForEveryone?: () => void;
  /** A narrow screen: screen share, the layout switch and devices move into More. */
  compact?: boolean;
}) {
  const key = (k: string) => (shortcutsOn ? ` (${k})` : "");

  return (
    <div className="controls" role="toolbar" aria-label="Call controls">
      <button
        type="button"
        className={`ctl tap${micOn ? "" : " is-off"}`}
        data-tip={micOn ? `Mute${key("M")}` : `Unmute${key("M")}`}
        aria-label="Microphone"
        aria-pressed={micOn}
        aria-keyshortcuts={shortcutsOn ? "M" : undefined}
        onClick={onMic}
      >
        {micOn ? <Microphone size={20} aria-hidden /> : <MicrophoneSlash size={20} aria-hidden />}
      </button>
      <button
        type="button"
        className={`ctl tap${camOn ? "" : " is-off"}`}
        data-tip={camOn ? `Turn camera off${key("V")}` : `Turn camera on${key("V")}`}
        aria-label="Camera"
        aria-pressed={camOn}
        aria-keyshortcuts={shortcutsOn ? "V" : undefined}
        onClick={onCam}
      >
        {camOn ? <VideoCamera size={20} aria-hidden /> : <VideoCameraSlash size={20} aria-hidden />}
      </button>
      {onScreen && !compact ? (
        <button
          type="button"
          className={`ctl tap${screenOn ? " is-active" : ""}`}
          data-tip={screenOn ? "Stop sharing" : "Share screen"}
          aria-label="Share screen"
          aria-pressed={screenOn}
          onClick={onScreen}
        >
          <MonitorArrowUp size={20} weight={screenOn ? "fill" : "regular"} aria-hidden />
        </button>
      ) : null}
      {onHand ? (
        <button
          type="button"
          className={`ctl tap${handUp ? " is-active" : ""}`}
          data-tip={handUp ? `Lower hand${key("H")}` : `Raise hand${key("H")}`}
          aria-label="Raise hand"
          aria-pressed={handUp}
          aria-keyshortcuts={shortcutsOn ? "H" : undefined}
          onClick={onHand}
        >
          <HandPalm size={20} weight={handUp ? "fill" : "regular"} aria-hidden />
        </button>
      ) : null}
      {onReact ? (
        <Popover label="Send a reaction" tip="React" icon={<Smiley size={20} aria-hidden />} panelClassName="is-reactions">
          {(close) => (
            <div className="react-row">
              {REACTIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="react-btn tap"
                  aria-label={r.label}
                  title={r.label}
                  onClick={() => {
                    onReact(r.id);
                    close();
                  }}
                >
                  <span aria-hidden>{r.emoji}</span>
                </button>
              ))}
            </div>
          )}
        </Popover>
      ) : null}

      <span className="ctl-sep" aria-hidden="true"></span>

      {onCaptions ? (
        <button
          type="button"
          className={`ctl tap${captionsOn ? " is-active" : ""}`}
          data-tip={captionsOn ? `Hide captions${key("C")}` : `Show captions${key("C")}`}
          aria-label="Live captions"
          aria-pressed={captionsOn}
          aria-keyshortcuts={shortcutsOn ? "C" : undefined}
          onClick={onCaptions}
        >
          <ClosedCaptioning size={20} weight={captionsOn ? "fill" : "regular"} aria-hidden />
        </button>
      ) : null}
      {compact ? null : (
        <button
          type="button"
          className={`ctl tap${gridOn ? " is-active" : ""}`}
          data-tip={gridOn ? `Speaker view${key("L")}` : `Grid view${key("L")}`}
          aria-label="Grid view"
          aria-pressed={gridOn}
          aria-keyshortcuts={shortcutsOn ? "L" : undefined}
          onClick={onLayout}
        >
          <SquaresFour size={20} weight={gridOn ? "fill" : "regular"} aria-hidden />
        </button>
      )}
      {room && !compact ? (
        <Popover label="Devices" tip="Devices" icon={<GearSix size={20} aria-hidden />} panelClassName="is-devices">
          {() => <DeviceMenu room={room} onPicked={onDevicePicked} />}
        </Popover>
      ) : null}
      <Popover label="More options" tip="More" icon={<DotsThree size={22} weight="bold" aria-hidden />} panelClassName="is-more">
        {() => (
          <div className="more-menu">
            {compact ? (
              <div className="more-toggles">
                <label className="more-switch">
                  <input type="checkbox" role="switch" checked={gridOn} onChange={onLayout} />
                  <span>
                    <strong>Grid view</strong>
                    <small>Everyone as equal tiles.</small>
                  </span>
                </label>
                {onScreen ? (
                  <label className="more-switch">
                    <input type="checkbox" role="switch" checked={screenOn} onChange={onScreen} />
                    <span>
                      <strong>Share screen</strong>
                    </span>
                  </label>
                ) : null}
                {room ? <DeviceMenu room={room} onPicked={onDevicePicked} /> : null}
              </div>
            ) : null}
            <label className="more-switch">
              <input type="checkbox" role="switch" checked={shortcutsOn} onChange={(e) => onShortcuts(e.target.checked)} />
              <span>
                <strong>Keyboard shortcuts</strong>
                <small>Single keys, off while you type in a field.</small>
              </span>
            </label>
            {shortcutsOn ? (
              <dl className="more-keys">
                {SHORTCUTS.map((s) => (
                  <div key={s.key}>
                    <dt>
                      <kbd>{s.key.toUpperCase()}</kbd>
                    </dt>
                    <dd>{s.label}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        )}
      </Popover>

      {onEndForEveryone ? (
        <Popover
          label="Leave or end the meeting"
          className="ctl-leave tap"
          activeClass=""
          icon={
            <>
              <PhoneDisconnect size={19} weight="fill" aria-hidden />
              <span className="ctl-leave-label">Leave</span>
            </>
          }
          panelClassName="is-leave"
        >
          {(close) => (
            <div className="leave-menu">
              <Link href={leaveHref} className="leave-opt tap">
                <strong>Leave the meeting</strong>
                <small>Everyone else stays.</small>
              </Link>
              <button
                type="button"
                className="leave-opt is-danger tap"
                onClick={() => {
                  close();
                  onEndForEveryone();
                }}
              >
                <strong>End for everyone</strong>
                <small>Closes the call for the whole room.</small>
              </button>
            </div>
          )}
        </Popover>
      ) : (
        <Link href={leaveHref} className="ctl-leave tap" aria-label="Leave meeting" data-tip="Leave">
          <PhoneDisconnect size={19} weight="fill" aria-hidden />
          <span className="ctl-leave-label">Leave</span>
        </Link>
      )}
    </div>
  );
}
