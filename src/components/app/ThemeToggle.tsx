"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { onPrefsChange, resolvedTheme, toggleTheme } from "@/lib/prefs";

/* Light/dark for the signed-in app. The attribute lives on `<html>` (an inline script in the root
   layout sets it before first paint from localStorage or the OS), so toggling is a plain DOM
   write and never re-renders the tree. Settings > Appearance and the command palette change the
   same preference; this button follows them. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const sync = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
    sync();
    // The OS can flip the theme while the choice is "system"; the attribute is the truth.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const off = onPrefsChange(() => setTheme(resolvedTheme()));
    return () => {
      observer.disconnect();
      off();
    };
  }, []);

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-bg-2 hover:text-ink motion-safe:active:scale-95"
    >
      {theme === "dark" ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
