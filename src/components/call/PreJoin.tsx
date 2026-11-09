"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Microphone,
  MicrophoneSlash,
  Record,
  Sparkle,
  VideoCamera,
  VideoCameraSlash,
  WarningCircle,
} from "@phosphor-icons/react";
import { CallToastProvider } from "@/components/call/CallToast";
import { CallTopBar } from "@/components/call/CallTopBar";
import { CALL_PREFS_KEY } from "@/components/call/prefs";
import { Select, type SelectOption } from "@/components/call/Select";
import { useOrgContext } from "@/lib/org-context";
import type { CallMeeting } from "@/components/call/resolve-meeting";

/* The pre-join "green room", ported from the meeting design: your own camera preview with mic and
   camera toggles and a level meter, device pickers, the meeting card, what your agent will do, and
   the recording consent that unlocks Join.

   The preview is real: it asks the browser for the camera and microphone, lists the devices it
   finds, and switches between them. Nothing leaves the browser. If access is denied or there is
   no device, the stage falls back to your initials with a short explanation, and you can still
   join. The mic and camera choices carry into the room through sessionStorage. */


type MediaStatus = "pending" | "ready" | "denied" | "missing";

const AGENT_PREP = [
  { kind: "note", text: "Takes private notes for you while you talk. Only you can see them." },
  { kind: "decision", text: "Flags decisions as they are made and waits for your Confirm before saving one." },
  { kind: "action", text: "Picks up action items with an owner and a due date, for you to approve." },
  { kind: "question", text: "Suggests questions and brings in context from your earlier meetings." },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function stopAll(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function PreJoin({ meeting }: { meeting: CallMeeting }) {
  const { user } = useOrgContext();
  const [micOff, setMicOff] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [status, setStatus] = useState<MediaStatus>("pending");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [request, setRequest] = useState<{ cam?: string; mic?: string }>({});
  const [cams, setCams] = useState<SelectOption[]>([]);
  const [mics, setMics] = useState<SelectOption[]>([]);
  const [camValue, setCamValue] = useState<string>();
  const [micValue, setMicValue] = useState<string>();

  const videoRef = useRef<HTMLVideoElement>(null);
  const meterRef = useRef<HTMLSpanElement>(null);

  // Acquire (or re-acquire, after a device switch) the camera and microphone. Camera off asks
  // for no video at all, so the camera is released and its light goes out; turning it back on
  // asks again.
  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (!media?.getUserMedia) {
      setStatus("missing");
      return;
    }
    setStatus("pending");
    media
      .getUserMedia({
        video: camOff ? false : request.cam ? { deviceId: { exact: request.cam } } : true,
        audio: request.mic ? { deviceId: { exact: request.mic } } : true,
      })
      .then(async (got) => {
        if (cancelled) {
          stopAll(got);
          return;
        }
        acquired = got;
        setStream(got);
        setStatus("ready");
        const camId = got.getVideoTracks()[0]?.getSettings().deviceId;
        if (camId) setCamValue(camId);
        setMicValue(got.getAudioTracks()[0]?.getSettings().deviceId);
        const devices = await media.enumerateDevices();
        if (cancelled) return;
        const toOptions = (kind: MediaDeviceKind, fallback: string) =>
          devices
            .filter((d) => d.kind === kind && d.deviceId)
            .map((d, i) => ({ value: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
        setCams(toOptions("videoinput", "Camera"));
        setMics(toOptions("audioinput", "Microphone"));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        setStream(null);
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "missing");
      });
    return () => {
      cancelled = true;
      stopAll(acquired);
    };
  }, [request, camOff]);

  // The preview element follows the stream.
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  // Mute acts on the track itself, so the level meter tells the truth.
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = !micOff));
  }, [stream, micOff]);

  // Level meter: the bars follow the microphone's real input level.
  const hasAudio = Boolean(stream?.getAudioTracks().length);
  useEffect(() => {
    if (!stream || !hasAudio || micOff) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const level = Math.min(1, Math.max(0.15, Math.sqrt(sum / data.length) * 4));
      meterRef.current?.style.setProperty("--lvl", level.toFixed(2));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [stream, hasAudio, micOff]);

  const ready = status === "ready";
  const showVideo = ready && !camOff && Boolean(stream?.getVideoTracks().length);
  const firstName = user.name.split(" ")[0];

  const placeholder = (what: string): SelectOption[] => [
    {
      value: "",
      label: status === "pending" ? "Checking..." : status === "denied" ? "Access blocked" : `No ${what} found`,
    },
  ];

  // The API gives the invite list as user ids without names, so the card says how many, not who.
  const others = Math.max(0, meeting.invited - 1);
  const invitedNote =
    others === 0 ? "Only you are invited" : `You and ${others} ${others === 1 ? "other" : "others"}`;

  const remember = () => {
    try {
      sessionStorage.setItem(
        CALL_PREFS_KEY,
        // Only a device you actually picked is pinned. Pinning the one the browser happened to
        // give (the system default at that moment) kept the call on the laptop mic after a
        // Bluetooth headset connected; unpinned, the room follows the system default.
        JSON.stringify({ micOff, camOff, micId: request.mic, camId: request.cam }),
      );
    } catch {
      // Storage blocked: the room simply starts with mic and camera on.
    }
  };

  return (
    <CallToastProvider>
      <div className="mx-meet cx-call">
        <div className="app">
          <CallTopBar />
          <div className="app-row">
            <main className="main">
              <section className="page" id="page-prejoin">
                <div className="page-scroll">
                  <div className="page-inner" style={{ maxWidth: 1240 }}>
                    <div className="screen-head reveal">
                      <div className="head-text">
                        <h1>Ready to join?</h1>
                        <p>Check your camera and mic. Your agent joins with you and starts taking notes.</p>
                      </div>
                    </div>

                    <div className="canvas is-fill cx-prejoin-canvas">
                      <div className="pv-left">
                        <div
                          className={`pv-stage reveal${showVideo ? "" : " is-cam-off"}`}
                          style={{ animationDelay: ".07s" }}
                          role="group"
                          aria-label="Your camera preview"
                        >
                          <video ref={videoRef} className="pv-video" autoPlay playsInline muted hidden={!showVideo} />
                          {showVideo ? null : (
                            <span className="pv-initials" aria-hidden="true">
                              {initials(user.name)}
                            </span>
                          )}
                          {status !== "ready" ? (
                            <span className="pv-status scrim-pill" role="status">
                              {status === "pending" ? null : <WarningCircle size={15} weight="fill" aria-hidden />}
                              {status === "pending"
                                ? "Asking for your camera and microphone"
                                : status === "denied"
                                  ? "Camera and mic are blocked. Allow them in your browser's site settings, then reload."
                                  : "No camera or microphone found. You can still join."}
                            </span>
                          ) : null}
                          <span className="preview-name scrim-pill">
                            {!micOff && ready ? (
                              <span className="wave" aria-hidden="true">
                                <i></i>
                                <i></i>
                                <i></i>
                                <i></i>
                              </span>
                            ) : null}
                            {firstName} · camera is {showVideo ? "on" : "off"}
                          </span>
                          {!micOff && ready && hasAudio ? (
                            <span ref={meterRef} className="mic-meter scrim-pill is-live" role="img" aria-label="Microphone level">
                              <i></i>
                              <i></i>
                              <i></i>
                              <i></i>
                              <i></i>
                            </span>
                          ) : null}
                          <div className="controls" role="toolbar" aria-label="Preview controls">
                            <button
                              type="button"
                              className={`ctl tap${micOff ? " is-off" : ""}`}
                              data-tip={micOff ? "Unmute" : "Mute"}
                              aria-label="Microphone"
                              aria-pressed={!micOff}
                              onClick={() => setMicOff((v) => !v)}
                            >
                              {micOff ? <MicrophoneSlash size={17} aria-hidden /> : <Microphone size={17} aria-hidden />}
                            </button>
                            <button
                              type="button"
                              className={`ctl tap${camOff ? " is-off" : ""}`}
                              data-tip={camOff ? "Camera on" : "Camera off"}
                              aria-label="Camera"
                              aria-pressed={!camOff}
                              onClick={() => setCamOff((v) => !v)}
                            >
                              {camOff ? <VideoCameraSlash size={18} aria-hidden /> : <VideoCamera size={18} aria-hidden />}
                            </button>
                          </div>
                        </div>

                        <div className="panel reveal" style={{ animationDelay: ".18s" }}>
                          <div className="panel-body pv-devices">
                            <Select
                              label="Camera"
                              options={ready && cams.length ? cams : placeholder("camera")}
                              value={camValue}
                              disabled={!ready}
                              openUp
                              onChange={(id) => setRequest((r) => ({ ...r, cam: id }))}
                            />
                            <Select
                              label="Microphone"
                              options={ready && mics.length ? mics : placeholder("microphone")}
                              value={micValue}
                              disabled={!ready}
                              openUp
                              onChange={(id) => setRequest((r) => ({ ...r, mic: id }))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rail-stack">
                        <div className="panel reveal" style={{ animationDelay: ".12s" }}>
                          <div className="panel-head">
                            <h2>Meeting</h2>
                            <span className="live-chip" style={{ marginLeft: "auto" }} suppressHydrationWarning>
                              {meeting.status === "live" ? <span className="live-dot" aria-hidden="true"></span> : null}
                              {meeting.status === "live"
                                ? "Live now"
                                : meeting.status === "past"
                                  ? "Ended"
                                  : `Starts ${new Date(meeting.startTime).toLocaleString(undefined, {
                                      weekday: "short",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}`}
                            </span>
                          </div>
                          <div className="panel-body">
                            <h3 className="detail-title" style={{ fontSize: 19 }}>
                              {meeting.title}
                            </h3>
                            <p className="detail-by">
                              {meeting.durationMinutes} min · {meeting.invited}{" "}
                              {meeting.invited === 1 ? "person" : "people"} invited
                            </p>
                            <div className="pv-lobby">
                              <span className="av-stack" style={{ marginTop: 0 }} aria-hidden="true">
                                <i className="cx-av">{initials(user.name)}</i>
                                {others > 0 ? <span className="av-more">+{others}</span> : null}
                              </span>
                              <span className="pv-lobby-note">{invitedNote}</span>
                            </div>
                          </div>
                        </div>

                        <div className="panel reveal" style={{ flex: 1, animationDelay: ".17s" }}>
                          <div className="panel-head">
                            <h2>Your agent is ready</h2>
                            <Sparkle size={12} weight="fill" className="text-[var(--accent)]" aria-hidden />
                          </div>
                          {AGENT_PREP.map((p) => (
                            <div className="panel-row is-top" key={p.text}>
                              <span className={`moment-dot is-${p.kind}`} style={{ marginTop: 5 }} aria-hidden="true"></span>
                              <span className="row-body">
                                <p className="row-sum" style={{ marginTop: 0 }}>
                                  {p.text}
                                </p>
                              </span>
                            </div>
                          ))}
                          <div className="panel-foot agent-foot">
                            <Sparkle size={13} weight="fill" aria-hidden />
                            Nothing is saved to your workspace until you confirm it.
                          </div>
                        </div>

                        <div className="consent-card reveal" style={{ animationDelay: ".21s" }}>
                          <div className="consent-row">
                            <span className="consent-ic" aria-hidden="true">
                              <Record size={15} weight="duotone" />
                            </span>
                            <span className="consent-body">
                              <strong>This meeting is recorded and transcribed</strong>
                              <small>
                                Your agent listens to take notes. The recording and transcript stay in your workspace and
                                follow its retention rules.
                              </small>
                            </span>
                          </div>
                          <button
                            type="button"
                            className="consent-check tap"
                            role="checkbox"
                            aria-checked={agreed}
                            onClick={() => setAgreed((v) => !v)}
                          >
                            <span className={`task-check${agreed ? " is-checked" : ""}`} aria-hidden="true">
                              <Check size={11} weight="bold" />
                            </span>
                            I understand, join with recording on
                          </button>
                        </div>

                        <div className="pv-actions reveal" style={{ animationDelay: ".24s" }}>
                          <Link href={`/meetings/${meeting.id}`} className="btn-ghost tap">
                            Cancel
                          </Link>
                          {agreed ? (
                            <Link href={`/meetings/${meeting.id}/room`} className="join-btn tap" onClick={remember}>
                              <VideoCamera size={16} weight="fill" aria-hidden />
                              Join meeting
                            </Link>
                          ) : (
                            <button
                              type="button"
                              className="join-btn is-locked"
                              aria-disabled="true"
                              data-tip="Acknowledge recording to join"
                            >
                              <VideoCamera size={16} weight="fill" aria-hidden />
                              Join meeting
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </CallToastProvider>
  );
}
