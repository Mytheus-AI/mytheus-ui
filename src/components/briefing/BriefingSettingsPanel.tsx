"use client";

import { useId, useState } from "react";
import { saveBriefingPreferences } from "@/app/actions/briefings";
import { Toggle } from "@/components/settings/Toggle";
import { CardHead, cardClass, cardPadX } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  LENGTHS,
  SPEEDS,
  nearestSpeed,
  speedLabel,
  type BriefingPreferences,
  type BriefingSettings,
} from "@/lib/briefing";

/* Settings > Briefings: whether your Myte briefs you after every meeting, auto-play, length,
   language (the live-caption languages) and how fast. Every change saves at once and says so; a
   refused change rolls back. The voice it speaks in is the Myte's one voice (ADR-0050), set on
   Your Myte only. */

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
}: {
  initial: BriefingSettings;
}) {
  const ids = useId();
  const [prefs, setPrefs] = useState<BriefingPreferences>(() => prefsOf(initial));
  const [saving, setSaving] = useState<string | null>(null);
  const save = async (patch: Partial<BriefingPreferences>, key: string, done: string) => {
    const before = prefs;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(key);
    const res = await saveBriefingPreferences({ ...next, server_voice: undefined });
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

  const enabledId = `${ids}-on`;
  const autoId = `${ids}-auto`;

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby={`${ids}-h1`} className={cardClass({ flush: true })}>
        <CardHead id={`${ids}-h1`} as="h3" title="Briefings from your Myte" description="About 90 seconds after each meeting: what changed for you, who is waiting on you, your promises and the questions still open. Only you hear it." divided />
        <div className="divide-y divide-line">
          <div className={`flex items-start justify-between gap-4 py-4 ${cardPadX}`}>
            <div className="min-w-0">
              <p id={enabledId} className="text-[15px] font-semibold text-ink">
                A briefing after every meeting
              </p>
              <p className="mt-0.5 text-[14px] text-ink-3">Off: your Myte only briefs you when you ask, with Brief me.</p>
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
        <CardHead id={`${ids}-h2`} as="h3" title="Length, language and speed" divided />
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
          <div className="grid items-start gap-5 sm:grid-cols-2 sm:gap-4">
          <div className="grid min-w-0 gap-1.5">
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
            <p className="text-[14px] text-ink-3">Your Myte writes it in English and translates it with the same translator the live captions use.</p>
          </div>
          <div className="grid min-w-0 gap-1.5">
            <label htmlFor={`${ids}-rate`} className="text-[15px] font-semibold text-ink">
              Briefing speed
            </label>
            <Dropdown
              id={`${ids}-rate`}
              label="Briefing speed"
              size="lg"
              value={String(nearestSpeed(prefs.rate))}
              disabled={saving === "rate"}
              onChange={(v) => void save({ rate: Number(v) }, "rate", "Speed saved")}
              options={SPEEDS.map((s) => ({ value: String(s), label: speedLabel(s), description: s === 1 ? "As written" : undefined }))}
            />
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
