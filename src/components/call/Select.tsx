"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown, Check } from "@phosphor-icons/react";

/* The design's custom dropdown. Options carry a value (a device id) and a label. With a single
   option or `disabled` it renders as a read-only field rather than an empty menu. */

export type SelectOption = { value: string; label: string };

export function Select({
  label,
  options,
  value,
  onChange,
  openUp = false,
  disabled = false,
}: {
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  openUp?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];
  const inert = disabled || options.length < 2;

  useEffect(() => {
    if (!open) return;
    function onDocDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`select${open ? " is-open" : ""}`} ref={rootRef}>
      <span className="select-label">{label}</span>
      <button
        type="button"
        className="select-btn tap"
        aria-haspopup={inert ? undefined : "listbox"}
        aria-expanded={inert ? undefined : open}
        aria-label={`${label}: ${selected?.label ?? "none"}`}
        disabled={inert}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected?.label ?? "None"}</span>
        {inert ? null : <CaretDown size={15} className="select-chev" aria-hidden />}
      </button>
      {open && !inert ? (
        <div className={`select-pop${openUp ? " is-up" : ""}`} role="listbox" aria-label={label}>
          {options.map((option) => {
            const isSel = option.value === selected?.value;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSel}
                key={option.value}
                className={`select-opt${isSel ? " is-selected" : ""}`}
                onClick={() => {
                  onChange?.(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
                {isSel ? <Check size={12} weight="bold" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
