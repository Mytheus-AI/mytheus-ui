"use client";

import { useEffect, useId, useState } from "react";
import { Room, RoomEvent } from "livekit-client";
import { Microphone, SpeakerHigh, VideoCamera, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";

/* In-call device switching (polish program, Phase 0): pick the microphone, camera and, where the
   browser allows it, the speaker, without leaving the call. Lists what the browser reports, shows
   the one in use, and switches the live track through LiveKit (`switchActiveDevice`), which keeps
   the publication, so nobody sees you drop out. A refusal (a device in use elsewhere, unplugged)
   is said in words under the pickers. */

type Kind = "audioinput" | "videoinput" | "audiooutput";

const LABEL: Record<Kind, string> = { audioinput: "Microphone", videoinput: "Camera", audiooutput: "Speaker" };
const ICON: Record<Kind, PhosphorIcon> = { audioinput: Microphone, videoinput: VideoCamera, audiooutput: SpeakerHigh };

export function DeviceMenu({ room, onPicked }: { room: Room; onPicked?: (kind: "mic" | "cam", deviceId: string) => void }) {
  const uid = useId();
  const [devices, setDevices] = useState<Record<Kind, MediaDeviceInfo[]>>({ audioinput: [], videoinput: [], audiooutput: [] });
  const [active, setActive] = useState<Record<Kind, string>>({ audioinput: "", videoinput: "", audiooutput: "" });
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const kinds: Kind[] = ["audioinput", "videoinput", "audiooutput"];
      const lists = await Promise.all(kinds.map((k) => Room.getLocalDevices(k, false).catch(() => [] as MediaDeviceInfo[])));
      if (cancelled) return;
      setDevices({ audioinput: lists[0], videoinput: lists[1], audiooutput: lists[2] });
      setActive({
        audioinput: room.getActiveDevice("audioinput") ?? lists[0][0]?.deviceId ?? "",
        videoinput: room.getActiveDevice("videoinput") ?? lists[1][0]?.deviceId ?? "",
        audiooutput: room.getActiveDevice("audiooutput") ?? lists[2][0]?.deviceId ?? "",
      });
    };
    void load();
    room.on(RoomEvent.MediaDevicesChanged, load);
    return () => {
      cancelled = true;
      room.off(RoomEvent.MediaDevicesChanged, load);
    };
  }, [room]);

  const pick = async (kind: Kind, deviceId: string) => {
    setProblem(null);
    const before = active[kind];
    setActive((a) => ({ ...a, [kind]: deviceId }));
    try {
      const ok = await room.switchActiveDevice(kind, deviceId, true);
      if (ok === false) throw new Error("refused");
      if (kind === "audioinput") onPicked?.("mic", deviceId);
      if (kind === "videoinput") onPicked?.("cam", deviceId);
    } catch {
      setActive((a) => ({ ...a, [kind]: before }));
      setProblem(`Could not switch to that ${LABEL[kind].toLowerCase()}. It may be in use by another app.`);
    }
  };

  // Choosing a speaker is not supported in every browser (Safari, Firefox): leave it out there.
  const canPickSpeaker =
    typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype && devices.audiooutput.length > 0;
  const kinds: Kind[] = canPickSpeaker ? ["audioinput", "videoinput", "audiooutput"] : ["audioinput", "videoinput"];

  return (
    <div className="dev-menu">
      <p className="pop-title">Devices</p>
      {kinds.map((kind) => {
        const Icon = ICON[kind];
        const list = devices[kind];
        return (
          <div className="dev-row" key={kind}>
            <label className="dev-label" htmlFor={`${uid}-${kind}`}>
              <Icon size={15} aria-hidden="true" />
              {LABEL[kind]}
            </label>
            <Dropdown
              id={`${uid}-${kind}`}
              label={LABEL[kind]}
              size="md"
              value={active[kind] || null}
              disabled={list.length === 0}
              emptyText="None found"
              options={list.map((d, i) => deviceOption(d, `${LABEL[kind]} ${i + 1}`))}
              onChange={(id) => void pick(kind, id)}
            />
          </div>
        );
      })}
      {problem ? (
        <p className="pop-problem" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

/* Browsers name the system default "Default - MacBook Pro Microphone (Built-in)": the device is
   the label and "System default" the quieter line under it. */
function deviceOption(d: MediaDeviceInfo, fallback: string): DropdownOption {
  const raw = d.label || fallback;
  const m = /^(default|communications)\s*-\s*(.+)$/i.exec(raw);
  if (m) return { value: d.deviceId, label: m[2], description: m[1].toLowerCase() === "default" ? "System default" : "Used for calls" };
  return { value: d.deviceId, label: raw };
}
