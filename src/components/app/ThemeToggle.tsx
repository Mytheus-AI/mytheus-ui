"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";

/* Light/dark for the signed-in app. The attribute lives on the `.mx-app` root (an inline script in
   AppShell sets it before first paint from localStorage or the OS), so toggling is a plain DOM
   write and never re-renders the tree. */

const KEY = "mx-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.querySelector(".mx-app");
    setTheme(root?.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.querySelector(".mx-app")?.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Private mode or blocked storage: the choice still applies for this visit.
    }
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={flip}
      aria-label={label}
      title={label}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-bg-2 hover:text-ink motion-safe:active:scale-95"
    >
      {theme === "dark" ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  );
}
