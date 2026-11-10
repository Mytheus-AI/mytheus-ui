"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";

/* A right-hand detail panel shared by the Tasks and Decisions screens. Not modal: the list stays
   usable beside it on wide screens. Under lg it covers the page and a scrim closes it. Focus moves
   to the close button on open and returns to whatever opened it on close. Escape closes. */
export function SidePanel({
  open,
  onClose,
  label,
  closeLabel,
  header,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  closeLabel: string;
  header?: ReactNode;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Rendered into the `.mx-app` root, not in place: an entrance animation on a page wrapper leaves a
  // transform behind, and a transformed ancestor becomes the containing block for `fixed`, which
  // made the parked panel stretch the page's scroll width and scroll with the content.
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => setHost(document.querySelector(".mx-app")), []);
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      const active = document.activeElement;
      openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
      const t = window.setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
      wasOpen.current = true;
      return () => window.clearTimeout(t);
    }
    if (!open && wasOpen.current) {
      wasOpen.current = false;
      const opener = openerRef.current;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      openerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!host) return null;

  return createPortal(
    <>
      {open && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={closeLabel}
          onClick={onClose}
          className="fixed inset-0 z-30 bg-[rgba(26,22,18,0.45)] lg:hidden"
        />
      )}
      <aside
        role="dialog"
        aria-modal="false"
        aria-label={label}
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-40 flex w-full flex-col border-l border-line bg-surface shadow-warm-3 transition-[transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none sm:w-[440px] ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <div className="flex min-h-[68px] items-center gap-3 border-b border-line px-5 py-3 sm:px-6">
          {header}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink active:bg-bg-3"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6">{children}</div>
      </aside>
    </>,
    host,
  );
}
