"use client";

import { useEffect } from "react";
import { watchTheme } from "@/lib/prefs";

/* Mounted once in the root layout. THEME_INIT sets `<html data-theme>` before first paint; this
   keeps it right afterwards: it follows the OS setting live while the choice is "system", and a
   choice made in another tab. Renders nothing. */
export function ThemeSync() {
  useEffect(() => watchTheme(), []);
  return null;
}
