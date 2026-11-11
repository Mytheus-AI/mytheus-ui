"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Clock,
  LockSimple,
  Microphone,
  MicrophoneSlash,
  NotePencil,
  Question,
  Record,
  Scales,
  ShieldCheck,
  Users,
  VideoCamera,
  VideoCameraSlash,
  WarningCircle,
  type Icon,
} from "@phosphor-icons/react";
import { Button, LinkButton } from "@/components/ui/Button";
import { initials, toneOf } from "@/components/room/tone";
import { CallToastProvider } from "@/components/call/CallToast";
import { CallTopBar } from "@/components/call/CallTopBar";
import { CONSENT_VERSION, ConsentTerms } from "@/components/call/consent";
import { CALL_PREFS_KEY } from "@/components/call/prefs";
import { Select, type SelectOption } from "@/components/call/Select";
import { useOrgContext } from "@/lib/org-context";
import type { CallMeeting } from "@/components/call/resolve-meeting";
import type { RoomSessionInfo } from "@/components/meeting/MeetingRoom";

/* The pre-join: your own camera preview on the warm stage with mic and camera toggles and a live
   level meter, device pickers, the meeting card, what your agent will do, and the recording
   consent that unlocks Join.

   Layout (meeting-call.css, "pre-join"): the preview and devices on the left, the meeting card
   and the agent's brief as the right rail, both columns ending on one line, then the notice with
   the agree box and Join across the full width straight under the preview. The source order is
   the phone's reading order: preview, devices, consent and Join, then the meeting and the agent.

   Consent is real (polish program, Phase 0; ADR-0018). The notice says exactly what is stored
   (components/call/consent.tsx). Agreeing and pressing Join sends the acknowledgment with the
   token request, and meeting-service records when you agreed and to which notice version. It is
   asked once per person per meeting: if you already agreed for this meeting, the card says when
   and Join is open. If the server refuses (not on the list, the meeting ended), the reason shows
   here and you stay on this page; there is no loop between the pre-join and the room.

   The preview is real: it asks the browser for the camera and microphone, lists the devices it
   finds, and switches between them. Nothing leaves the browser. If access is denied or there is
   no device, the stage falls back to your initials with a short explanation, and you can still
   join. The mic and camera choices carry into the room through sessionStorage. */


type MediaStatus = "pending" | "ready" | "denied" | "missing";

const AGENT_PREP: { icon: Icon; text: string }[] = [
  { icon: NotePencil, text: "Takes private notes for you while you talk. Only you can see them." },
  { icon: Scales, text: "Flags decisions as they are made and waits for your Confirm before saving one." },
  { icon: CheckSquare, text: "Picks up action items with an owner and a due date, for you to approve." },
  { icon: Question, text: "Suggests questions and brings in context from your earlier meetings." },
];

function stopAll(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const consentedFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });

/** Why the server would not let you in, in words, by its stable code. */
function joinRefusal(code: string | undefined): string {
  switch (code) {
    case "NOT_A_PARTICIPANT":
      return "You are not on this meeting's participant list. Ask the host to add you, then try again.";
    case "VERSION_CONFLICT":
      return "This meeting has ended, so it cannot be joined.";
    case "EXTERNAL_MEETING":
      return "This meeting happens in Google Meet, Teams or Zoom. Join it there; Mytheus captures it from your browser.";
    case "NOT_FOUND":
      return "This meeting could not be found. It may have been removed.";
    default:
      return "Could not reach the meeting just now. Check your connection and try again.";
  }
}

export function PreJoin({ meeting, session = null }: { meeting: CallMeeting; session?: RoomSessionInfo | null }) {
  const { user } = useOrgContext();
  const router = useRouter();
  const alreadyAgreed = session?.consentedAt ?? null;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
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
  // The level is written as `--lvl` on the page root, so the stage bars and the devices meter
  // both follow it without re-rendering.
  const meterRef = useRef<HTMLDivElement>(null);

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

  const startLabel =
    meeting.status === "live"
      ? "Live now"
      : meeting.status === "past"
        ? "Ended"
        : `Starts ${new Date(meeting.startTime).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}`;
  const micLive = !micOff && ready && hasAudio;
  const canJoin = Boolean(alreadyAgreed) || agreed;

  const join = async () => {
    if (!canJoin || joining) return;
    setJoining(true);
    setJoinError(null);
    remember();
    if (!alreadyAgreed) {
      // The acknowledgment travels with the token request; meeting-service records it before it
      // mints, so the room's own mint never meets a consent gate.
      try {
        const response = await fetch("/api/livekit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meeting_id: meeting.id, consent: { version: CONSENT_VERSION } }),
        });
        if (!response.ok) {
          const problem = (await response.json().catch(() => ({}))) as { code?: string };
          setJoinError(joinRefusal(problem.code));
          setJoining(false);
          return;
        }
      } catch {
        setJoinError(joinRefusal(undefined));
        setJoining(false);
        return;
      }
    }
    router.push(`/meetings/${meeting.id}/room`);
  };

  return (
    <CallToastProvider>
      <div className="mx-meet cx-call" ref={meterRef}>
        <CallTopBar
          end={
            <LinkButton href={`/meetings/${meeting.id}`} variant="outline" size="sm">
              <ArrowLeft size={16} weight="bold" aria-hidden />
              Back to meeting
            </LinkButton>
          }
        />
        <main className="pj" id="page-prejoin">
          <header className="pj-head">
            <h1>Ready to join?</h1>
            <p>Check your camera and microphone. Your agent joins with you and takes notes that only you review.</p>
          </header>

          <div className="pj-grid">
            <div className="pj-left">
              <section
                className={`pv-stage ${toneOf(user.id)}${showVideo ? " has-video" : ""}`}
                aria-label="Your camera preview"
              >
                <video ref={videoRef} className="pv-video" autoPlay playsInline muted hidden={!showVideo} />
                {showVideo ? null : (
                  <span className="pv-initials" aria-hidden="true">
                    {initials(user.name)}
                  </span>
                )}
                {status !== "ready" ? (
                  <span className="pj-tag pv-status" role="status">
                    {status === "pending" ? null : <WarningCircle size={16} weight="fill" aria-hidden />}
                    {status === "pending"
                      ? "Asking for your camera and microphone"
                      : status === "denied"
                        ? "Camera and mic are blocked. Allow them in your browser's site settings, then reload."
                        : "No camera or microphone found. You can still join."}
                  </span>
                ) : null}
                {ready && hasAudio ? (
                  <span className="pj-tag pj-tag-mic" role="img" aria-label={micOff ? "Microphone muted" : "Microphone level"}>
                    <span className={`pj-wave${micOff ? " is-off" : ""}`} aria-hidden="true">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                    <small>{micOff ? "Mic off" : "Mic on"}</small>
                  </span>
                ) : null}
                <span className="pj-tag pj-tag-name">
                  {firstName}
                  <small>{showVideo ? "Camera on" : "Camera off"}</small>
                </span>
                <div className="controls" role="toolbar" aria-label="Preview controls">
                  <button
                    type="button"
                    className={`ctl tap${micOff ? " is-off" : ""}`}
                    data-tip={micOff ? "Unmute" : "Mute"}
                    aria-label="Microphone"
                    aria-pressed={!micOff}
                    onClick={() => setMicOff((v) => !v)}
                  >
                    {micOff ? <MicrophoneSlash size={20} aria-hidden /> : <Microphone size={20} aria-hidden />}
                  </button>
                  <button
                    type="button"
                    className={`ctl tap${camOff ? " is-off" : ""}`}
                    data-tip={camOff ? "Turn camera on" : "Turn camera off"}
                    aria-label="Camera"
                    aria-pressed={!camOff}
                    onClick={() => setCamOff((v) => !v)}
                  >
                    {camOff ? <VideoCameraSlash size={20} aria-hidden /> : <VideoCamera size={20} aria-hidden />}
                  </button>
                </div>
              </section>

              <section className="pj-card pj-devices" aria-labelledby="pj-dev-h">
                <div className="pj-card-head">
                  <h2 id="pj-dev-h">Devices</h2>
                  {ready ? (
                    <span className={`mx-chip ${hasAudio ? "is-ok" : "is-medium"}`}>
                      {hasAudio ? <Check size={14} weight="bold" aria-hidden /> : <WarningCircle size={14} weight="fill" aria-hidden />}
                      {hasAudio ? "Microphone working" : "No microphone"}
                    </span>
                  ) : status === "pending" ? null : (
                    <span className="mx-chip is-high">
                      <WarningCircle size={14} weight="fill" aria-hidden />
                      {status === "denied" ? "Access blocked" : "Nothing found"}
                    </span>
                  )}
                </div>
                <div className="pj-dev">
                  <Select
                    label="Camera"
                    options={ready && cams.length ? cams : placeholder("camera")}
                    value={camValue}
                    disabled={!ready}
                    onChange={(id) => setRequest((r) => ({ ...r, cam: id }))}
                  />
                  <Select
                    label="Microphone"
                    options={ready && mics.length ? mics : placeholder("microphone")}
                    value={micValue}
                    disabled={!ready}
                    onChange={(id) => setRequest((r) => ({ ...r, mic: id }))}
                  />
                  {ready && hasAudio ? (
                    <div className="pj-level">
                      <span className="pj-level-label" id="pj-lvl-l">
                        Input level
                      </span>
                      <div className="pj-meter-row">
                        <span className={`pj-meter${micLive ? "" : " is-off"}`} role="img" aria-labelledby="pj-lvl-l">
                          <span className="pj-meter-fill" />
                        </span>
                        <span className="pj-meter-state">{micOff ? "Muted" : "Live"}</span>
                      </div>
                      <p className="pj-help">Say a few words. The bar should move past the middle when you speak.</p>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>

            <section className="pj-card pj-consent" aria-labelledby="pj-consent-h">
              <div className="pj-consent-head">
                <span className="pj-consent-ico" aria-hidden="true">
                  <Record size={22} weight="fill" />
                </span>
                <div>
                  <h2 id="pj-consent-h">
                    {session?.recording ? "This meeting is recorded and transcribed" : "This meeting is transcribed"}
                  </h2>
                  <p>{alreadyAgreed ? "What is kept, as you agreed." : "Read this before you join. You need to agree to enter."}</p>
                </div>
              </div>
              <ConsentTerms recording={session?.recording ?? null} />
              <div className="pj-consent-foot">
                {alreadyAgreed ? (
                  <p className="pj-agreed" role="status">
                    <Check size={16} weight="bold" aria-hidden />
                    You agreed to this for this meeting on {consentedFormat.format(new Date(alreadyAgreed))}. You will not
                    be asked again.
                  </p>
                ) : (
                  <label className="pj-check">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      aria-describedby="pj-gate"
                    />
                    <span className="pj-box" aria-hidden="true">
                      <Check size={14} weight="bold" />
                    </span>
                    <span className="pj-check-text">I have read this and agree to join on these terms</span>
                  </label>
                )}
                <div className="pj-consent-act">
                  <div className="pj-join">
                    <LinkButton href={`/meetings/${meeting.id}`} variant="outline" size="lg">
                      Cancel
                    </LinkButton>
                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      disabled={!canJoin || joining}
                      aria-describedby="pj-gate"
                      onClick={() => void join()}
                    >
                      <VideoCamera size={18} weight="fill" aria-hidden />
                      {joining ? "Joining..." : "Join meeting"}
                    </Button>
                  </div>
                  {joinError ? (
                    <p className="pj-join-error" role="alert">
                      <WarningCircle size={16} weight="fill" aria-hidden />
                      {joinError}
                    </p>
                  ) : null}
                  <p className="pj-gate" id="pj-gate" aria-live="polite">
                    {canJoin ? (
                      <>
                        <Check size={14} weight="bold" aria-hidden />
                        Ready. Your mic and camera choices come with you.
                      </>
                    ) : (
                      <>
                        <LockSimple size={14} aria-hidden />
                        Tick the agreement to enable Join.
                      </>
                    )}
                  </p>
                </div>
              </div>
            </section>

            <div className="pj-right">
              <section className="pj-card pj-meet" aria-labelledby="pj-meet-h">
                <span className={`mx-chip ${meeting.status === "live" ? "is-high" : meeting.status === "past" ? "" : "is-low"}`} suppressHydrationWarning>
                  {meeting.status === "live" ? <span className="mx-live-dot" aria-hidden="true"></span> : null}
                  {startLabel}
                </span>
                <h2 id="pj-meet-h">{meeting.title}</h2>
                <ul className="pj-list">
                  <li>
                    <Clock size={19} aria-hidden />
                    {meeting.durationMinutes} min
                  </li>
                  <li>
                    <Users size={19} aria-hidden />
                    {meeting.invited} {meeting.invited === 1 ? "person" : "people"} invited
                  </li>
                  <li>
                    <VideoCamera size={19} aria-hidden />
                    Mytheus room
                  </li>
                </ul>
                <div className="pj-in">
                  <span className="mx-avs" aria-hidden="true">
                    <span className={`mx-av ${toneOf(user.id)}`}>{initials(user.name)}</span>
                    {others > 0 ? <span className="mx-av">+{others}</span> : null}
                  </span>
                  {invitedNote}
                </div>
              </section>

              <section className="pj-card pj-agent" aria-labelledby="pj-agent-h">
                <div className="pj-card-head">
                  <h2 id="pj-agent-h">Your agent is ready</h2>
                </div>
                <ul className="pj-agent-list">
                  {AGENT_PREP.map((p) => (
                    <li key={p.text}>
                      <span className="pj-agent-ico" aria-hidden="true">
                        <p.icon size={17} />
                      </span>
                      <p>{p.text}</p>
                    </li>
                  ))}
                </ul>
                <p className="pj-foot">
                  <ShieldCheck size={16} weight="fill" aria-hidden />
                  Nothing is saved to your workspace until you confirm it.
                </p>
              </section>

            </div>
          </div>
        </main>
      </div>
    </CallToastProvider>
  );
}
