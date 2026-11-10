"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "./Button";

/* A modal dialog with the behaviour every form dialog needs, in one place: focus moves inside on
   open (to `initialFocus` or the first field), Tab and Shift+Tab stay inside, Escape or the scrim
   closes (unless `busy`), and focus returns to whatever opened it. The title is the accessible
   name and the description, when given, its description. A child that handles Escape itself (a
   picker closing its list) calls `preventDefault()` and the dialog leaves it alone.

   Sizes: `md` 520px for short forms, `lg` 680px for a form with a secret or a code block. Below
   that width it is the full width minus the page gutter, and it scrolls inside the viewport. */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  busy = false,
  size = "md",
  tone = "default",
  initialFocus,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** while true, Escape and the scrim do nothing (a write is in flight) */
  busy?: boolean;
  size?: "md" | "lg";
  tone?: "default" | "danger";
  /** the element to focus on open; defaults to the first focusable field */
  initialFocus?: React.RefObject<HTMLElement>;
}) {
  const uid = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = document.activeElement;
    opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
    const t = window.setTimeout(() => {
      const target =
        initialFocus?.current ??
        panel.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled])") ??
        panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    }, 30);
    return () => {
      window.clearTimeout(t);
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
    // Focus is placed once per opening; `initialFocus` is a stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (!busy) onClose();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
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
    <div className="fixed inset-0 z-[70] grid place-items-start justify-items-center overflow-y-auto px-4 py-[8vh] sm:py-[12vh]" onKeyDown={onKey}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={close} className="fixed inset-0 bg-[rgba(26,22,18,0.45)] backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        aria-describedby={description ? `${uid}-desc` : undefined}
        className={`mx-pop relative w-full rounded-hero border bg-surface p-5 shadow-warm-3 sm:p-7 ${size === "lg" ? "max-w-[680px]" : "max-w-[520px]"} ${
          tone === "danger" ? "border-[color:color-mix(in_srgb,var(--priority-high)_30%,var(--line))]" : "border-line"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={`${uid}-title`} className="display text-[22px] text-ink-display">
              {title}
            </h2>
            {description ? (
              <div id={`${uid}-desc`} className="mt-1 text-[14px] leading-relaxed text-ink-3">
                {description}
              </div>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" icon onClick={close} aria-label={`Close ${title.toLowerCase()}`} disabled={busy}>
            <X size={16} aria-hidden />
          </Button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
