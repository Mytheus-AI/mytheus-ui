"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { useCrumbLabel, useCrumbParent } from "@/components/app/Crumb";
import { useMyAgent } from "@/lib/my-agent";
import { useOrgContext } from "@/lib/org-context";
import { defaultDoodleSeed } from "@/lib/doodle";
import { parsePageContext } from "@/lib/ask-myte/page-context";
import { useModKey } from "./mod-key";
import { AskMyteContext, type Layer, type OpenOptions, type Request } from "./sheet-context";

export { useAskMyteSheet } from "./sheet-context";

/* Ask Myte everywhere (ADR-0047 D1): ⌘J (Ctrl+J) on any app page, the floating Myte button, and
   the "Ask about this meeting/decision" buttons all open one sheet. It is mounted once in the
   shell and loaded only when first opened, so pages that never use it carry none of its code.
   After that it stays mounted while hidden, so a conversation survives closing it and moving
   between pages. On /ask itself ⌘J focuses the page's own ask box instead. */

const AskMyteSheet = dynamic(() => import("./AskMyteSheet").then((m) => m.AskMyteSheet), { ssr: false });

export { useModKey };

export function AskMyteProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [request, setRequest] = useState<Request | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const onAsk = pathname === "/ask" || !!pathname?.startsWith("/ask/");

  const doOpen = useCallback((opts: OpenOptions = {}) => {
    const el = document.activeElement;
    opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
    setLoaded(true);
    setOpen(true);
    setRequest((r) => ({ page: opts.page ?? null, question: opts.question ?? null, n: (r?.n ?? 0) + 1 }));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    const back = opener.current;
    opener.current = null;
    requestAnimationFrame(() => {
      if (back?.isConnected) back.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== "j") return;
      e.preventDefault();
      if (onAsk) {
        document.querySelector<HTMLTextAreaElement>("[data-ask-input='page']")?.focus();
        return;
      }
      if (open) close();
      else doOpen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onAsk, close, doOpen]);

  // Moving to /ask (Open full page) closes the sheet.
  useEffect(() => {
    if (onAsk && open) setOpen(false);
  }, [onAsk, open]);

  const value = useMemo<Layer>(() => ({ open: doOpen, close, isOpen: open, loaded, request, onAsk }), [doOpen, close, open, loaded, request, onAsk]);

  return <AskMyteContext.Provider value={value}>{children}</AskMyteContext.Provider>;
}

/** The floating Myte button and the sheet. Rendered inside the shell's themed root so they wear
    the app's tokens in both themes. */
export function AskMyteLayer() {
  const { open, close, isOpen, loaded, request, onAsk } = useContext(AskMyteContext);
  const pathname = usePathname();
  const label = useCrumbLabel();
  const parent = useCrumbParent();
  const agent = useMyAgent();
  const { user } = useOrgContext();
  const mod = useModKey();

  const persona = useMemo(
    () => ({
      name: agent?.name ?? (user.name.split(" ")[0] ? `${user.name.split(" ")[0]}'s Myte` : "Your Myte"),
      seed: agent?.seed ?? defaultDoodleSeed(`agent:${user.id}`),
      personality: agent?.personality ?? null,
    }),
    [agent, user.name, user.id],
  );
  const pageFromPath = useMemo(() => parsePageContext(pathname, { label, parent }), [pathname, label, parent]);

  return (
    <>
      {!onAsk ? (
        // Kept mounted while the sheet is open (only hidden), so closing can hand focus back to it.
        <button
          type="button"
          hidden={isOpen}
          onClick={() => open()}
          aria-label={`Ask ${persona.name} (${mod}J)`}
          title={`Ask ${persona.name} (${mod}J)`}
          aria-haspopup="dialog"
          className={`group fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-40 ${isOpen ? "hidden" : "grid"} h-14 w-14 place-items-center rounded-full border border-line bg-surface shadow-warm-2 transition-[box-shadow,transform] duration-150 hover:shadow-warm-3 motion-safe:active:scale-95 sm:bottom-6 sm:right-6`}
        >
          <span className="block h-11 w-11 overflow-hidden rounded-full">
            <AgentOrb seed={persona.seed} size={44} />
          </span>
        </button>
      ) : null}
      {loaded ? <AskMyteSheet open={isOpen} onClose={close} persona={persona} pathPage={pageFromPath} request={request} modKey={mod} /> : null}
    </>
  );
}
