"use client";

import { useEffect, useState } from "react";

/* The canvas pieces on the home page (React Bits, WebGL) cannot read CSS custom properties, so
   they get literal colours. These mirror the tokens in src/app/globals.css (light) and
   src/styles/app-theme.css (dark); if a token changes there, change it here too. */
export const PALETTE = {
  light: {
    bg: "#f0eee6",
    bg2: "#e8e5da",
    bg3: "#ded9cb",
    surface: "#ffffff",
    line2: "#d6d1c2",
    ink: "#1f1e1d",
    ink3: "#6b645b",
    signal: "#c15f3c",
    signalLine: "#d97757",
    signalDeep: "#a8472a",
    signalSoft: "#f7e9e1",
    peach: "#efcbb5",
    ochre: "#ecd9ae",
    pill: "#262625",
    pill2: "#33312f",
  },
  dark: {
    bg: "#1a1816",
    bg2: "#302d2a",
    bg3: "#38342f",
    surface: "#232120",
    line2: "#4a453f",
    ink: "#f3f0e8",
    ink3: "#a9a296",
    signal: "#e0805f",
    signalLine: "#e0805f",
    signalDeep: "#c15f3c",
    signalSoft: "#3a2a23",
    peach: "#6b3f2c",
    ochre: "#5a4a2a",
    pill: "#f3f0e8",
    pill2: "#e2ddd2",
  },
} as const;

export type SiteTheme = keyof typeof PALETTE;

/** The marketing site's theme, following `<html data-theme>` as the nav switch flips it. */
export function useSiteTheme(): SiteTheme {
  const [theme, setTheme] = useState<SiteTheme>("light");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setTheme(el.dataset.theme === "dark" ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}
