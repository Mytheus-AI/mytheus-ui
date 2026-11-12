"use client";

import Link from "next/link";
import type { Room } from "livekit-client";
import {
  ClosedCaptioning,
  DotsThree,
  EyeSlash,
  GearSix,
  HandPalm,
  Microphone,
  MicrophoneSlash,
  MonitorArrowUp,
  PhoneDisconnect,
  Receipt,
  Smiley,
  SquaresFour,
  VideoCamera,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { useId } from "react";
import { Popover } from "@/components/room/Popover";
import { Dropdown } from "@/components/ui/Dropdown";
import { DeviceMenu } from "@/components/room/DeviceMenu";
import { CaptionLanguagePicker } from "@/components/room/CaptionLanguage";
import { CAPTION_LANGUAGES, isCaptionLanguage, type CaptionLanguage } from "@/lib/realtime/privacy";
import { REACTIONS, ordinal, type ReactionId } from "@/lib/realtime/room-live";
import { SHORTCUTS } from "@/lib/realtime/shortcuts";

/* The dark control bar, floating at the bottom of the stage. It keeps only the controls the room
   can honour: mic, camera, screen share (while a real call is connected), raise hand and
   reactions (while the meeting link is joined), captions, devices, the layout switch, More
   (keyboard shortcuts, with an off switch), and Leave. Off (mic or camera muted) is red, an active
   toggle is inverted, Leave is the one strong button.

   The host (or the meeting's creator) gets a Leave menu: leave on your own, or End for everyone,
   which asks once more before it ends the meeting for the whole room.

   Shortcut letters appear in the tooltips only while shortcuts are on.

   Wave 3: Off the record (the host or creator takes the meeting off the record and back; anyone
   else asks them), the caption language beside the captions button, and "What is recorded" in
   More. */

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
  handPlace = 0,
  onHand,
  onReact,
  room = null,
  onDevicePicked,
  shortcutsOn,
  onShortcuts,
  onEndForEveryone,
  compact = false,
  offRecord,
  captionLanguage,
  onWhatIsRecorded,
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
  /** Your place in the hands queue while your hand is up, from 1. */
  handPlace?: number;
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
  /** Off the record: present while the meeting link is joined. `steers` toggles; anyone else asks. */
  offRecord?: { active: boolean; steers: boolean; busy: boolean; asked: boolean; onPress: () => void };
  /** The caption language picker: present while captions are available. */
  captionLanguage?: { value: CaptionLanguage | null; onChange: (language: CaptionLanguage | null) => void };
  /** Opens your consent receipt and what the meeting keeps. */
  onWhatIsRecorded?: () => void;
}) {
  const key = (k: string) => (shortcutsOn ? ` (${k})` : "");
  const uid = useId();

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
          className={`ctl tap${handUp ? " is-hand" : ""}`}
          data-tip={handUp ? `Lower hand${key("H")}${handPlace ? `, ${ordinal(handPlace)} in line` : ""}` : `Raise hand${key("H")}`}
          aria-label="Raise hand"
          aria-pressed={handUp}
          aria-describedby={handUp && handPlace ? `${uid}-hand` : undefined}
          aria-keyshortcuts={shortcutsOn ? "H" : undefined}
          onClick={onHand}
        >
          <HandPalm size={20} weight={handUp ? "fill" : "regular"} aria-hidden />
          {handUp && handPlace ? (
            <span className="ctl-badge" id={`${uid}-hand`}>
              <span className="sr-only">Your hand is up, </span>
              {handPlace}
              <span className="sr-only"> in line</span>
            </span>
          ) : null}
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

      {offRecord && !compact ? (
        <button
          type="button"
          className={`ctl tap${offRecord.active ? " is-offrec" : ""}`}
          data-tip={
            offRecord.steers
              ? offRecord.active
                ? "Back on the record"
                : "Go off the record"
              : offRecord.active
                ? "The meeting is off the record"
                : offRecord.asked
                  ? "You asked the host"
                  : "Ask to go off the record"
          }
          aria-label={offRecord.steers ? "Off the record" : offRecord.active ? "Off the record" : "Ask to go off the record"}
          aria-pressed={offRecord.steers || offRecord.active ? offRecord.active : undefined}
          aria-disabled={!offRecord.steers && (offRecord.active || offRecord.asked) ? true : undefined}
          aria-busy={offRecord.busy || undefined}
          onClick={() => {
            if (offRecord.busy) return;
            if (!offRecord.steers && (offRecord.active || offRecord.asked)) return;
            offRecord.onPress();
          }}
        >
          <EyeSlash size={20} weight={offRecord.active ? "fill" : "regular"} aria-hidden />
        </button>
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
      {onCaptions && captionLanguage && !compact ? (
        <CaptionLanguagePicker value={captionLanguage.value} onChange={captionLanguage.onChange} />
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
        {(close) => (
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
                {onCaptions && captionLanguage ? (
                  <div className="more-select">
                    <span id={`${uid}-lang`}>Caption language</span>
                    <Dropdown
                      label="Caption language"
                      labelledBy={`${uid}-lang`}
                      size="md"
                      value={captionLanguage.value ?? ""}
                      options={[
                        { value: "", label: "As spoken", description: "No translation" },
                        ...CAPTION_LANGUAGES.map((l) => ({ value: l.code, label: l.name, description: l.native })),
                      ]}
                      onChange={(v) => captionLanguage.onChange(isCaptionLanguage(v) ? v : null)}
                    />
                  </div>
                ) : null}
                {offRecord ? (
                  <button
                    type="button"
                    className="more-item tap"
                    aria-disabled={!offRecord.steers && (offRecord.active || offRecord.asked) ? true : undefined}
                    onClick={() => {
                      if (offRecord.busy || (!offRecord.steers && (offRecord.active || offRecord.asked))) return;
                      close();
                      offRecord.onPress();
                    }}
                  >
                    <EyeSlash size={18} weight={offRecord.active ? "fill" : "regular"} aria-hidden />
                    <span>
                      <strong>
                        {offRecord.steers
                          ? offRecord.active
                            ? "Back on the record"
                            : "Go off the record"
                          : offRecord.active
                            ? "Off the record"
                            : offRecord.asked
                              ? "You asked the host"
                              : "Ask to go off the record"}
                      </strong>
                      <small>
                        {offRecord.active ? "Mytes are paused and nothing is transcribed." : "Pauses every Myte and the transcript."}
                      </small>
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {onWhatIsRecorded ? (
              <button
                type="button"
                className="more-item tap"
                onClick={() => {
                  close();
                  onWhatIsRecorded();
                }}
              >
                <Receipt size={18} aria-hidden />
                <span>
                  <strong>What is recorded</strong>
                  <small>Your agreement and what this meeting keeps.</small>
                </span>
              </button>
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
