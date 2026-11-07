"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";

/* The authenticated shell. On desktop the nav is an icon rail or a labelled column (the user's
   choice, remembered); below lg it becomes an overlay drawer opened from the Topbar. Route
   changes, Escape, overlay click and nav clicks close the drawer. Cmd/Ctrl+K opens the palette.
   The `.mx-app` root scopes the redesigned theme (see styles/app-theme.css); the inline script
   sets light/dark before first paint so there is no flash.

   h-dvh (not min-h-dvh) so <main> is the scroll container: the Topbar stays reachable on long
   pages and the nav column stays fixed. MeetingRoom's h-[calc(100dvh-4rem)] relies on main being
   exactly viewport minus the h-16 Topbar. */

const EASE_OUT: [number, number, number, number] = [0.2, 0.7, 0.2, 1];
const SB_KEY = "mx-sb";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rail, setRail] = useState(false);
  // False until the saved sidebar mode has been applied. The server cannot know it, so the first
  // paint is the expanded column; without this the rail visibly slid shut on every full page load.
  const [sbSynced, setSbSynced] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const drawerTransition = { duration: reduceMotion ? 0 : 0.15, ease: EASE_OUT };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SB_KEY);
      setRail(saved ? saved === "rail" : window.innerWidth < 1280);
    } catch {
      setRail(window.innerWidth < 1280);
    }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSbSynced(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  const toggleRail = () => {
    setRail((r) => {
      try {
        localStorage.setItem(SB_KEY, r ? "expanded" : "rail");
      } catch {
        // Storage blocked: the toggle still works for this visit.
      }
      return !r;
    });
  };

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (e.key === "Escape") {
        setNavOpen(false);
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* lock the page scroll behind the drawer */
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <div suppressHydrationWarning className={`mx-app ${appFontClass} flex h-dvh bg-bg ${sbSynced ? "" : "sb-instant"}`}>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />

      <div
        className={`sb-slot relative hidden shrink-0 lg:block ${rail ? "w-[76px]" : "w-[252px]"}`}
      >
        <Sidebar rail={rail} onToggleRail={toggleRail} />
      </div>

      <AnimatePresence>
        {navOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={drawerTransition}
            />
            <motion.div
              className="relative z-10 h-full w-[252px]"
              initial={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
              transition={drawerTransition}
            >
              <Sidebar drawer onNavigate={() => setNavOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} onSearchClick={() => setPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
