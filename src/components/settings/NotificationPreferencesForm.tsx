"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { saveNotificationPreferences } from "@/app/actions/notifications";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  fromView,
  toView,
  type ChannelPreference,
  type EmailMode,
  type PreferencesView,
} from "@/lib/notification-preferences";
import { FormFooter, InlineRow, Note, SaveStatus, SectionCard, focusPill } from "./primitives";
import { Toggle } from "./Toggle";

/* How alerts from your agent reach you: in the meeting (always), by email (on or off, urgent
   only or everything), and Slack (after it is connected in integrations, from P12). Saves through
   a server action to notification-service; nothing about the user or the tenant is sent. */

const MODES: { value: EmailMode; label: string; help: string }[] = [
  { value: "urgent", label: "Urgent only", help: "Conflicts with an earlier decision" },
  { value: "all", label: "All alerts", help: "Also workload, blocked work and missing people" },
];

export function NotificationPreferencesForm({ initial, loaded }: { initial: ChannelPreference[]; loaded: boolean }) {
  const [prefs, setPrefs] = useState(initial);
  const [view, setView] = useState<PreferencesView>(() => toView(initial));
  const [saved, setSaved] = useState<PreferencesView>(() => toView(initial));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const ids = { inApp: useId(), email: useId(), mode: useId(), slack: useId() };
  const dirty = view.emailEnabled !== saved.emailEnabled || view.emailMode !== saved.emailMode;

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const res = await saveNotificationPreferences(fromView(view, prefs));
    setBusy(false);
    if (!res.ok) {
      setStatus({ tone: "error", text: res.message });
      return;
    }
    setPrefs(res.items);
    const next = toView(res.items);
    setView(next);
    setSaved(next);
    setStatus({ tone: "ok", text: "Preferences saved." });
  };

  return (
    <SectionCard title="Alerts and notifications" description="How alerts from your agent reach you.">
      {loaded ? null : (
        <div className="px-4 py-4 sm:px-[22px]">
          <Note tone="warning">We could not load your saved preferences, so the defaults are shown.</Note>
        </div>
      )}
      <InlineRow
        label="In the meeting"
        labelId={ids.inApp}
        help="Conflicts, workload, blocked work and missing people appear in your agent sidebar."
      >
        <Badge>Always on</Badge>
      </InlineRow>

      <InlineRow label="Email" labelId={ids.email} help="Send alerts to your inbox as well.">
        <Toggle
          labelledBy={ids.email}
          checked={view.emailEnabled}
          onChange={(next) => setView((v) => ({ ...v, emailEnabled: next }))}
        />
      </InlineRow>

      {view.emailEnabled ? (
        <div className="px-4 py-4 sm:px-[22px] md:py-[18px]">
          <span id={ids.mode} className="block text-[15px] font-semibold text-ink">
            Which alerts to email
          </span>
          <div
            role="radiogroup"
            aria-labelledby={ids.mode}
            className="mt-3 grid gap-2 sm:grid-cols-2"
            onKeyDown={(e) => {
              const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const i = MODES.findIndex((m) => m.value === view.emailMode);
              const next = MODES[(i + step + MODES.length) % MODES.length];
              setView((v) => ({ ...v, emailMode: next.value }));
              e.currentTarget.querySelector<HTMLButtonElement>(`[data-mode="${next.value}"]`)?.focus();
            }}
          >
            {MODES.map((m) => {
              const on = view.emailMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  data-mode={m.value}
                  onClick={() => setView((v) => ({ ...v, emailMode: m.value }))}
                  className={`flex items-start gap-3 rounded-ctl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 ${focusPill} ${
                    on
                      ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]"
                      : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
                      on ? "border-signal" : "border-ink-3"
                    }`}
                  >
                    {on ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold text-ink">{m.label}</span>
                    <span className="block text-[13px] leading-snug text-ink-3">{m.help}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <InlineRow
        label="Slack"
        labelId={ids.slack}
        help={
          <Link
            href="/settings/integrations"
            className={`inline-flex items-center gap-1 font-semibold text-signal underline-offset-4 hover:text-signal-deep hover:underline ${focusPill}`}
          >
            Connect Slack in integrations
            <ArrowRight size={12} weight="bold" aria-hidden="true" />
          </Link>
        }
      >
        <Badge>Not connected</Badge>
      </InlineRow>

      <FormFooter>
        <Button disabled={!dirty || busy} className={focusPill} onClick={() => void save()}>
          {busy ? "Saving preferences" : "Save preferences"}
        </Button>
        <SaveStatus tone={status?.tone}>{status?.text ?? ""}</SaveStatus>
      </FormFooter>
    </SectionCard>
  );
}
