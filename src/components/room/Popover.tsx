"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/* A small disclosure popover for the control bar (reactions, devices, more, leave). The trigger
   is a real button with `aria-expanded` and `aria-controls`; the panel opens above it, takes focus
   on its first control, and closes on Escape (focus returns to the trigger), on a click outside,
   and when focus leaves it. No portal: it is positioned inside the control bar's stacking context,
   so it never sits behind the stage. */

export function Popover({
  label,
  tip,
  className = "ctl tap",
  activeClass = " is-active",
  icon,
  children,
  panelClassName = "",
  panelLabel,
}: {
  /** The trigger's accessible name. */
  label: string;
  tip?: string;
  className?: string;
  activeClass?: string;
  icon: ReactNode;
  /** The panel body; `close` lets an item close the popover after acting. */
  children: (close: () => void) => ReactNode;
  panelClassName?: string;
  panelLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) window.setTimeout(() => trigger.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = panel.current?.querySelector<HTMLElement>("button, select, input, [tabindex='0']");
    first?.focus();
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  return (
    <div
      className="ctl-pop"
      ref={wrap}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
      onBlur={(e) => {
        if (open && wrap.current && !wrap.current.contains(e.relatedTarget as Node | null)) close(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={`${className}${open ? activeClass : ""}`}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        data-tip={open ? undefined : tip}
        onClick={() => setOpen((v) => !v)}
      >
        {icon}
      </button>
      <div
        ref={panel}
        id={id}
        role="group"
        aria-label={panelLabel ?? label}
        className={`ctl-pop-panel ${panelClassName}`}
        hidden={!open}
      >
        {open ? children(() => close()) : null}
      </div>
    </div>
  );
}
