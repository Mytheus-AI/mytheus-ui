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

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="grid h-10 w-10 place-items-center rounded-pill text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink active:scale-95"
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
