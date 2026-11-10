"use client";

import { useEffect, useId, useState } from "react";
import { Desktop, Moon, Sun, type Icon } from "@phosphor-icons/react";
import { SectionCard } from "@/components/ui/Card";
import { InlineRow } from "@/components/ui/Form";
import { onPrefsChange, setShortcutsOn, setThemeChoice, shortcutsOn, themeChoice, type ThemeChoice } from "@/lib/prefs";
import { Toggle } from "./Toggle";

/* Settings > Appearance. Everything here is a convenience of this browser (localStorage), not
   account data, and applies the moment it changes, so there is nothing to save:
   - Theme: light, dark, or whatever the device uses (the topbar's switch and the command palette
     change the same choice).
   - Keyboard shortcuts: the Inbox's single-key shortcuts (j, k, e, z) can be turned off, so a
     speech-input or single-switch user never triggers one by accident (WCAG 2.1.4).
   - Sidebar: the full labelled column, or the icon rail that opens on hover or focus. */

const THEMES: { value: ThemeChoice; label: string; help: string; icon: Icon }[] = [
  { value: "light", label: "Light", help: "Cream stage, white cards", icon: Sun },
  { value: "dark", label: "Dark", help: "Warm dark, easier at night", icon: Moon },
  { value: "system", label: "Match this device", help: "Follows your system setting", icon: Desktop },
];

const SB_KEY = "mx-sb";
type SidebarMode = "expanded" | "rail";

function readSidebar(): SidebarMode {
  try {
    return localStorage.getItem(SB_KEY) === "rail" ? "rail" : "expanded";
  } catch {
    return "expanded";
  }
}

function RadioCards<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: string; help: string; icon?: Icon }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="grid gap-2.5 px-4 py-4 sm:grid-cols-3 sm:px-[22px] md:py-[18px]">
      <legend className="sr-only">{legend}</legend>
      {options.map((o) => {
        const on = value === o.value;
        const I = o.icon;
        return (
          <label
            key={o.value}
            className={`flex cursor-pointer items-start gap-3 rounded-ctl border px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
              on ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]" : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={on} onChange={() => onChange(o.value)} className="sr-only" />
            {I ? <I size={20} weight={on ? "fill" : "regular"} className={`mt-0.5 shrink-0 ${on ? "text-signal" : "text-ink-3"}`} aria-hidden /> : null}
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{o.label}</span>
              <span className="mt-0.5 block text-[14px] leading-snug text-ink-3">{o.help}</span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function AppearancePanel() {
  const shortcutsId = useId();
  // The server cannot read localStorage: the first render uses the defaults, then the saved
  // values are applied after mount (hydration-safe).
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [keys, setKeys] = useState(true);
  const [sidebar, setSidebar] = useState<SidebarMode>("expanded");

  useEffect(() => {
    const sync = () => {
      setTheme(themeChoice());
      setKeys(shortcutsOn());
    };
    sync();
    setSidebar(readSidebar());
    return onPrefsChange(sync);
  }, []);

  return (
    <div className="grid gap-5">
      <SectionCard title="Theme" headingId="theme-h" headingLevel={3} description="Applies to the app on this browser. The marketing site stays light.">
        <RadioCards
          name="theme"
          legend="Theme"
          value={theme}
          options={THEMES}
          onChange={(v) => {
            setTheme(v);
            setThemeChoice(v);
          }}
        />
      </SectionCard>

      <SectionCard title="Keyboard" headingId="keyboard-h" headingLevel={3}>
        <InlineRow
          label="Single-key shortcuts"
          labelId={shortcutsId}
          help="Single-key shortcuts in the Inbox: j and k move, e marks done, z undoes. Turn them off if you use speech input or a switch device. Cmd or Ctrl K (search) always works."
        >
          <Toggle
            labelledBy={shortcutsId}
            checked={keys}
            onChange={(next) => {
              setKeys(next);
              setShortcutsOn(next);
            }}
          />
        </InlineRow>
      </SectionCard>

      <SectionCard
        title="Sidebar"
        headingId="sidebar-h"
        headingLevel={3}
        description="The pin button at the top of the sidebar changes the same thing. A change here applies the next time a page loads."
      >
        <RadioCards
          name="sidebar"
          legend="Sidebar"
          value={sidebar}
          options={[
            { value: "expanded", label: "Full column", help: "Every item with its name" },
            { value: "rail", label: "Icon rail", help: "Opens while you hover or tab into it" },
          ]}
          onChange={(v) => {
            setSidebar(v);
            try {
              localStorage.setItem(SB_KEY, v);
            } catch {
              // Storage blocked: the sidebar keeps its current mode.
            }
          }}
        />
      </SectionCard>
    </div>
  );
}
