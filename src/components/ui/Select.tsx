"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

/* A themed single select. The native <select> opens the operating system's menu, which ignores
   the app's tokens (a white list with a blue highlight on the dark theme), so this is a button
   plus an ARIA listbox: same keyboard model as a native select (arrows, Home/End, type to jump,
   Enter/Space to pick, Escape to close), focus stays on the button, and the menu follows the
   theme. */

export type SelectOption<T extends string> = { value: T; label: string; icon?: ReactNode };

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  className = "",
  size = "md",
  align = "left",
}: {
  value: T;
  onChange: (v: T) => void;
  options: SelectOption<T>[];
  /** accessible name; not rendered */
  label: string;
  className?: string;
  size?: "sm" | "md";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const id = useId();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openAt = (i: number) => {
    setActive(i);
    setOpen(true);
  };
  const pick = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    if (e.key === "Escape" && open) {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openAt(selectedIndex);
      }
      return;
    }
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, last));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") pick(active);
    else if (e.key.length === 1) {
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
      typed.current.at = now;
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text.toLowerCase()));
      if (i >= 0) setActive(i);
      return;
    } else return;
    e.preventDefault();
  };

  const h = size === "sm" ? "h-9 text-[14px]" : "h-10 text-[14px]";

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openAt(selectedIndex))}
        onKeyDown={onKey}
        className={`flex w-full items-center gap-2 rounded-full border bg-surface pl-4 pr-3 text-left font-medium text-ink transition-[border-color,box-shadow] duration-150 focus-visible:!rounded-full ${h} ${
          open ? "border-signal shadow-[0_0_0_3px_var(--signal-soft)]" : "border-line hover:border-line-2"
        }`}
      >
        {selected?.icon ? <span className="shrink-0 text-ink-3">{selected.icon}</span> : null}
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <CaretDown
          size={14}
          weight="bold"
          aria-hidden
          className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={`absolute top-[calc(100%+6px)] z-50 max-h-72 min-w-full max-w-[calc(100vw-32px)] overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-warm-3 motion-safe:animate-[fadeUp_0.14s_var(--ease-out)_both] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
                className={`flex min-h-[38px] cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-[12px] px-3 text-[14px] ${
                  i === active ? "bg-bg-2 text-ink" : "text-ink-2"
                } ${isSelected ? "font-semibold" : "font-medium"}`}
              >
                {o.icon ? <span className="shrink-0 text-ink-3">{o.icon}</span> : null}
                <span className="flex-1 truncate">{o.label}</span>
                <Check size={14} weight="bold" aria-hidden className={`shrink-0 text-signal ${isSelected ? "" : "invisible"}`} />
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
