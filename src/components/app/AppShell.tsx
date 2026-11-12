"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar, type LiveCall, type SidebarAgent } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { CommandPalette } from "@/components/app/CommandPalette";
import { DoodleImageSync } from "@/components/app/DoodleImageSync";
import { CrumbProvider } from "@/components/app/Crumb";
import { MyAgentProvider } from "@/lib/my-agent";
import { Toaster } from "@/components/ui/Toaster";
import { inboxCount as readInboxCount } from "@/app/actions/inbox";
import { INBOX_COUNT_EVENT } from "@/lib/inbox";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";

/* The authenticated shell. On desktop the nav is an icon rail or a labelled column (the user's
   choice, remembered); below lg it becomes an overlay drawer opened from the Topbar. Route
   changes, Escape, the scrim, the drawer's close button and nav clicks close the drawer; focus
   moves into it on open, stays inside while it is open, and returns to the menu button on close.
   Cmd/Ctrl+K opens the palette. The shell also holds the Inbox's open count for the sidebar
   (read after load, again when the route changes or the window regains focus, at most every 30
   seconds, and set directly by the Inbox as you triage it through the `mx-inbox-count` event),
   the topbar breadcrumb's state, and the one toast surface. The `.mx-app` root scopes the redesigned theme (see
   styles/app-theme.css); the inline script sets light/dark before first paint so there is no
   flash.

   h-dvh (not min-h-dvh) so <main> is the scroll container: the Topbar stays reachable on long
   pages and the nav column stays fixed. */

const EASE_OUT: [number, number, number, number] = [0.215, 0.61, 0.355, 1];
const SB_KEY = "mx-sb";
const COUNT_EVERY_MS = 30_000;
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AppShell({
  children,
  liveCall = null,
  agent = null,
}: {
  children: React.ReactNode;
  /** The signed-in person's agent, for the sidebar's agent tab. Null: the tab is drawn generic. */
  agent?: SidebarAgent | null;
  /** A meeting the signed-in person is in, for the sidebar's in-call card. None is wired yet. */
  liveCall?: LiveCall | null;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [rail, setRail] = useState(false);
  // False until the saved sidebar mode has been applied. The server cannot know it, so the first
  // paint is the expanded column; without this the rail visibly slid shut on every full page load.
  const [sbSynced, setSbSynced] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const drawerTransition = { duration: reduceMotion ? 0 : 0.2, ease: EASE_OUT };
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpener = useRef<HTMLElement | null>(null);
  const [inboxCount, setInboxCount] = useState<number | null>(null);
  const countReadAt = useRef(0);

  useEffect(() => {
    const refresh = (force = false) => {
      const now = Date.now();
      if (!force && now - countReadAt.current < COUNT_EVERY_MS) return;
      countReadAt.current = now;
      readInboxCount()
        .then((n) => setInboxCount(n))
        .catch(() => {
          // A failed count shows no number; the Inbox itself still opens.
        });
    };
    refresh();
    const onFocus = () => refresh();
    const onSet = (e: Event) => {
      const n = (e as CustomEvent<number>).detail;
      if (typeof n === "number") {
        countReadAt.current = Date.now();
        setInboxCount(n);
      }
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(INBOX_COUNT_EVENT, onSet);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(INBOX_COUNT_EVENT, onSet);
    };
  }, []);

  useEffect(() => {
    if (countReadAt.current === 0) return;
    if (Date.now() - countReadAt.current < COUNT_EVERY_MS) return;
    countReadAt.current = Date.now();
    readInboxCount()
      .then((n) => setInboxCount(n))
      .catch(() => {});
  }, [pathname]);

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

  /* lock the page scroll behind the drawer, move focus in, and hand it back on close */
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = document.activeElement;
    drawerOpener.current = el instanceof HTMLElement && el !== document.body ? el : null;
    const t = window.setTimeout(() => {
      drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    }, 30);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
      if (drawerOpener.current?.isConnected) drawerOpener.current.focus({ preventScroll: true });
      drawerOpener.current = null;
    };
  }, [navOpen]);

  const trapDrawer = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !drawerRef.current) return;
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <MyAgentProvider value={agent ?? null}>
    <CrumbProvider>
    <div suppressHydrationWarning className={`mx-app ${appFontClass} flex h-dvh bg-bg ${sbSynced ? "" : "sb-instant"}`}>
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      <a
        href="#main"
        className="sr-only z-[90] rounded-ctl bg-pill px-4 py-2.5 text-[14px] font-semibold text-pill-on focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <div
        // z-40: the open rail overlays the page, so it must sit above positioned page content.
        // Below the drawer (z-50) and palette (z-80).
        className={`sb-slot relative z-40 hidden shrink-0 lg:block ${rail ? "w-[76px]" : "w-[252px]"}`}
      >
        <Sidebar rail={rail} onToggleRail={toggleRail} liveCall={liveCall} agent={agent} inboxCount={inboxCount} />
      </div>

      <AnimatePresence>
        {navOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            onKeyDown={trapDrawer}
          >
            <motion.button
              type="button"
              tabIndex={-1}
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-[rgba(26,22,18,0.45)] backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={drawerTransition}
            />
            <motion.div
              ref={drawerRef}
              className="relative z-10 h-full w-[252px] max-w-[calc(100vw-48px)]"
              initial={{ x: reduceMotion ? 0 : -260, opacity: reduceMotion ? 0 : 1 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: reduceMotion ? 0 : -260, opacity: reduceMotion ? 0 : 1 }}
              transition={drawerTransition}
            >
              <Sidebar drawer liveCall={liveCall} agent={agent} inboxCount={inboxCount} onNavigate={() => setNavOpen(false)} onClose={() => setNavOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} onSearchClick={() => setPaletteOpen(true)} />
        <main id="main" tabIndex={-1} className="flex-1 focus:outline-none overflow-y-auto overflow-x-hidden px-4 pb-12 pt-1 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} agentName={agent?.name ?? null} />
      <DoodleImageSync />
      <Toaster />
    </div>
    </CrumbProvider>
    </MyAgentProvider>
  );
}
