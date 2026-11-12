"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Play, SpeakerHigh, Waveform } from "@phosphor-icons/react";
import { saveBriefingPreferences } from "@/app/actions/briefings";
import { Toggle } from "@/components/settings/Toggle";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass, cardPadX } from "@/components/ui/Card";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { Dropdown } from "@/components/ui/Dropdown";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  LENGTHS,
  SPEEDS,
  nearestSpeed,
  pickVoice,
  speedLabel,
  voiceTone,
  voicesFor,
  type BriefingPersonality,
  type BriefingPreferences,
  type BriefingSettings,
} from "@/lib/briefing";

/* Settings > Briefings: whether your agent briefs you after every meeting, auto-play, length,
   language (the live-caption languages), the voice it speaks in and how fast. Every change saves
   at once and says so; a refused change rolls back. The voice section shows the server voices
   when this workspace renders audio (TTS connected), and otherwise the voices this device has,
   with "Matched to your agent" as the default and a Preview that speaks a line in that voice. */

const AUTO = "__auto__";

function prefsOf(s: BriefingSettings): BriefingPreferences {
  return {
    enabled: s.enabled ?? true,
    auto_play: s.auto_play ?? false,
    length: s.length ?? "standard",
    language: s.language ?? "en",
    voice: s.voice ?? null,
    server_voice: s.server_voice ?? null,
    rate: s.rate ?? 1,
  };
}

export function BriefingSettingsPanel({
  initial,
  agentName,
  agentSeed,
  personality,
}: {
  initial: BriefingSettings;
  agentName: string;
  agentSeed: string;
  personality: BriefingPersonality;
}) {
  const ids = useId();
  const [prefs, setPrefs] = useState<BriefingPreferences>(() => prefsOf(initial));
  const [saving, setSaving] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setCanSpeak(true);
    const s = window.speechSynthesis;
    const load = () => setVoices(s.getVoices());
    load();
    s.addEventListener?.("voiceschanged", load);
    return () => s.removeEventListener?.("voiceschanged", load);
  }, []);

  const save = async (patch: Partial<BriefingPreferences>, key: string, done: string) => {
    const before = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(key);
    const res = await saveBriefingPreferences(next);
    setSaving(null);
    if (res.ok) {
      setPrefs(prefsOf(res.settings));
      notifySuccess(done);
    } else {
      setPrefs(before);
      notifyError(res.message);
    }
  };

  const language = prefs.language ?? "en";
  const usable = useMemo(() => voicesFor(voices, language), [voices, language]);
  const matched = useMemo(() => pickVoice(voices, { language, seed: agentSeed }), [voices, language, agentSeed]);
  const chosen = prefs.voice && usable.some((v) => v.name === prefs.voice) ? prefs.voice : AUTO;

  const preview = () => {
    if (!("speechSynthesis" in window)) return;
    const s = window.speechSynthesis;
    s.cancel();
    const u = new SpeechSynthesisUtterance(`Hi, it's ${agentName}. Here's what changed for you since your last meeting.`);
    const v = pickVoice(voices, { language: "en", seed: agentSeed, preferred: chosen === AUTO ? null : chosen });
    if (v) {
      u.voice = v;
      u.lang = v.lang;
    }
    const tone = voiceTone(personality);
    u.rate = Math.min(4, Math.max(0.3, nearestSpeed(prefs.rate) * tone.rate));
    u.pitch = tone.pitch;
    s.speak(u);
  };

  const enabledId = `${ids}-on`;
  const autoId = `${ids}-auto`;

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${ids}-h1`} className={cardClass({ flush: true })}>
        <CardHead id={`${ids}-h1`} as="h3" title="Briefings from your agent" description="About 90 seconds after each meeting: what changed for you, who is waiting on you, your promises and the questions still open. Only you hear it." divided />
        <div className="divide-y divide-line">
          <div className={`flex items-start justify-between gap-4 py-4 ${cardPadX}`}>
            <div className="min-w-0">
              <p id={enabledId} className="text-[15px] font-semibold text-ink">
                A briefing after every meeting
              </p>
              <p className="mt-0.5 text-[14px] text-ink-3">Off: your agent only briefs you when you ask, with Brief me.</p>
            </div>
            <Toggle checked={prefs.enabled ?? true} labelledBy={enabledId} disabled={saving === "enabled"} onChange={(v) => void save({ enabled: v }, "enabled", v ? "Briefings turned on" : "Briefings turned off")} />
          </div>
          <div className={`flex items-start justify-between gap-4 py-4 ${cardPadX}`}>
            <div className="min-w-0">
              <p id={autoId} className="text-[15px] font-semibold text-ink">
                Start playing when it opens
              </p>
              <p className="mt-0.5 text-[14px] text-ink-3">A new briefing starts by itself. Some browsers ask you to press play the first time.</p>
            </div>
            <Toggle checked={prefs.auto_play ?? false} labelledBy={autoId} disabled={saving === "auto"} onChange={(v) => void save({ auto_play: v }, "auto", v ? "Auto-play turned on" : "Auto-play turned off")} />
          </div>
        </div>
      </section>

      <section aria-labelledby={`${ids}-h2`} className={cardClass({ flush: true })}>
        <CardHead id={`${ids}-h2`} as="h3" title="Length and language" divided />
        <div className={`grid gap-5 py-4 ${cardPadX}`}>
          <fieldset>
            <legend className="text-[15px] font-semibold text-ink">How long</legend>
            <div role="radiogroup" aria-label="How long" className="mt-2 grid gap-2.5 sm:grid-cols-2">
              {LENGTHS.map((l) => {
                const on = prefs.length === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={saving === "length"}
                    onClick={() => !on && void save({ length: l.value }, "length", `Briefings will be ${l.label.toLowerCase()}`)}
                    className={`rounded-ctl border px-4 py-3 text-left transition-colors duration-150 ${on ? "border-signal bg-signal-soft" : "border-line-2 bg-surface hover:bg-surface-2"}`}
                  >
                    <span className={`block text-[15px] font-semibold ${on ? "text-signal-ink" : "text-ink"}`}>{l.label}</span>
                    <span className={`mt-0.5 block text-[14px] ${on ? "text-signal-ink" : "text-ink-3"}`}>{l.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-1.5 sm:max-w-[360px]">
            <label htmlFor={`${ids}-lang`} className="text-[15px] font-semibold text-ink">
              Language
            </label>
            <Dropdown
              id={`${ids}-lang`}
              label="Language"
              size="lg"
              value={language}
              disabled={saving === "language"}
              onChange={(v) => void save({ language: v }, "language", "Language saved")}
              options={(initial.languages ?? []).map((l) => ({ value: l.code, label: l.name }))}
            />
            <p className="text-[14px] text-ink-3">Your agent writes it in English and translates it with the same translator the live captions use.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby={`${ids}-h3`} className={cardClass({ flush: true })}>
        <CardHead
          id={`${ids}-h3`}
          as="h3"
          title="Voice"
          description={
            initial.server_voice_connected
              ? "Your briefings are recorded on the server, so they sound the same on every device and play from the lock screen."
              : "Your device speaks your briefings. Pick a voice it has, or let Mytheus match one to your agent."
          }
          divided
        />
        <div className={`flex flex-wrap items-center gap-4 py-4 ${cardPadX}`}>
          <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full bg-surface shadow-warm-2 ring-2 ring-surface" aria-hidden>
            <AgentOrb seed={agentSeed} size={56} />
          </span>
          <div className="grid min-w-0 flex-[1_1_16rem] gap-3 sm:grid-cols-2">
            {initial.server_voice_connected ? (
              <div className="grid gap-1.5">
                <label htmlFor={`${ids}-sv`} className="text-[14px] font-semibold text-ink-2">
                  {agentName}&apos;s voice
                </label>
                <Dropdown
                  id={`${ids}-sv`}
                  label={`${agentName}'s voice`}
                  icon={<Waveform size={16} aria-hidden />}
                  value={prefs.server_voice ?? AUTO}
                  onChange={(v) => void save({ server_voice: v === AUTO ? null : v }, "server_voice", "Voice saved")}
                  options={[
                    { value: AUTO, label: "Matched to your agent", description: "Chosen from its personality" },
                    ...(initial.server_voices ?? []).map((v) => ({ value: v.id, label: v.name, description: v.description })),
                  ]}
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <label htmlFor={`${ids}-dv`} className="text-[14px] font-semibold text-ink-2">
                  {agentName}&apos;s voice on this device
                </label>
                <Dropdown
                  id={`${ids}-dv`}
                  label={`${agentName}'s voice on this device`}
                  icon={<SpeakerHigh size={16} aria-hidden />}
                  value={chosen}
                  disabled={!canSpeak || usable.length === 0}
                  placeholder={canSpeak ? "No voices for this language" : "This browser cannot speak"}
                  onChange={(v) => void save({ voice: v === AUTO ? null : v }, "voice", "Voice remembered")}
                  options={[
                    { value: AUTO, label: "Matched to your agent", description: matched ? matched.name : "The device default" },
                    ...usable.map((v) => ({ value: v.name, label: v.name.replace(/\s*\(.*\)$/, ""), description: v.lang })),
                  ]}
                  panelMinWidth={260}
                />
              </div>
            )}
            <div className="grid gap-1.5">
              <label htmlFor={`${ids}-rate`} className="text-[14px] font-semibold text-ink-2">
                Speed
              </label>
              <Dropdown
                id={`${ids}-rate`}
                label="Speed"
                value={String(nearestSpeed(prefs.rate))}
                onChange={(v) => void save({ rate: Number(v) }, "rate", "Speed saved")}
                options={SPEEDS.map((s) => ({ value: String(s), label: speedLabel(s), description: s === 1 ? "As written" : undefined }))}
              />
            </div>
          </div>
          {!initial.server_voice_connected ? (
            <Button type="button" variant="outline" size="md" onClick={preview} disabled={!canSpeak}>
              <Play size={16} weight="fill" aria-hidden />
              Preview
            </Button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
