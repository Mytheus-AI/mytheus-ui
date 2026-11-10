"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { CaretDown, Check, MagnifyingGlass, Trash, WarningCircle, X } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { dangerGhost } from "@/components/settings/primitives";
import type { MemberOption } from "./types";

/* Client pieces shared by the brain's editors: the status line every save reports to, an inline
   two-step remove, a field message, and the member picker. Tokens only, both themes. */

/* ---------------- the status line ---------------- */

export type Flash = { tone: "ok" | "error" | "busy"; text: string } | null;

/** A status message that clears itself a few seconds after a success. */
export function useFlash(): [Flash, (f: Flash) => void] {
  const [flash, setFlash] = useState<Flash>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = useCallback((f: Flash) => {
    if (timer.current) clearTimeout(timer.current);
    setFlash(f);
    if (f?.tone === "ok") timer.current = setTimeout(() => setFlash(null), 4000);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return [flash, set];
}

/** Always mounted, so a screen reader hears every change. */
export function FlashLine({ flash, className = "" }: { flash: Flash; className?: string }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className={`inline-flex min-h-[22px] items-center gap-1.5 text-[14px] font-medium ${
        flash?.tone === "error" ? "text-priority-high" : flash?.tone === "ok" ? "text-ok" : "text-ink-3"
      } ${className}`}
    >
      {flash?.tone === "ok" ? <Check size={15} weight="bold" aria-hidden /> : null}
      {flash?.tone === "error" ? <WarningCircle size={16} weight="fill" aria-hidden /> : null}
      {flash?.text}
    </p>
  );
}

/** The message under a field: the error, announced, or a quiet hint. */
export function FieldMsg({ id, error, hint }: { id: string; error?: string | null; hint?: ReactNode }) {
  if (error)
    return (
      <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-snug text-priority-high">
        <WarningCircle size={15} weight="bold" className="mt-px shrink-0" aria-hidden />
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={id} className="mt-1.5 text-[13px] leading-snug text-ink-3">
        {hint}
      </p>
    );
  return null;
}

/** "120 of 2000", red past the limit. */
export function Count({ n, max, className = "" }: { n: number; max: number; className?: string }) {
  return (
    <span aria-hidden className={`shrink-0 text-[13px] tabular-nums ${n > max ? "text-priority-high" : "text-ink-3"} ${className}`}>
      {n} of {max}
    </span>
  );
}

/* ---------------- remove, in two steps ---------------- */

/** "Remove" turns into "Remove {what}?" with Remove and Keep, so one stray click never deletes.
    Native buttons (the frozen Button does not forward refs), styled like its sm sizes. */
export function RemoveButton({
  what,
  onConfirm,
  disabled,
  compact = false,
}: {
  what: string;
  onConfirm: () => void;
  disabled?: boolean;
  /** icon-only until asked to confirm, for dense rows */
  compact?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [refocus, setRefocus] = useState(false);
  const yes = useRef<HTMLButtonElement>(null);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (asking) yes.current?.focus();
    else if (refocus) {
      first.current?.focus();
      setRefocus(false);
    }
  }, [asking, refocus]);

  const btn =
    "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-ctl px-3.5 text-[14px] font-semibold transition-colors duration-150 focus-visible:!rounded-ctl disabled:pointer-events-none disabled:opacity-50";

  if (!asking)
    return (
      <button
        ref={first}
        type="button"
        disabled={disabled}
        onClick={() => setAsking(true)}
        aria-label={compact ? `Remove ${what}` : undefined}
        title={compact ? `Remove ${what}` : undefined}
        className={`${btn} border border-transparent text-ink-3 hover:bg-priority-high-soft hover:text-priority-high ${compact ? "!h-10 !w-10 !px-0" : ""}`}
      >
        <Trash size={16} aria-hidden />
        {compact ? null : "Remove"}
      </button>
    );

  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label={`Remove ${what}?`}>
      <button
        ref={yes}
        type="button"
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
        className={`${btn} border ${dangerGhost}`}
      >
        Remove
      </button>
      <button
        type="button"
        onClick={() => {
          setAsking(false);
          setRefocus(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAsking(false);
            setRefocus(true);
          }
        }}
        className={`${btn} border border-transparent text-ink-2 hover:bg-bg-2 hover:text-ink`}
      >
        Keep
      </button>
    </span>
  );
}

/* ---------------- the member picker ---------------- */

/**
 * Pick one workspace member: a button showing the chosen face and name, opening a searchable
 * list. Keyboard: Enter, Space or the arrows open it; type to search; arrows move; Enter picks;
 * Escape closes and returns focus. `allowNone` adds a "No owner" row at the top.
 */
export function MemberPicker({
  id,
  members,
  value,
  onChange,
  label,
  invalid,
  describedBy,
  allowNone,
  noneLabel = "No owner",
  placeholder = "Pick a person",
  disabled,
  size = "md",
}: {
  id?: string;
  members: readonly MemberOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  /** accessible name */
  label: string;
  invalid?: boolean;
  describedBy?: string;
  allowNone?: boolean;
  noneLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const auto = useId();
  const baseId = id ?? auto;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const selected = value ? members.find((m) => m.id === value) ?? null : null;
  const q = query.trim().toLowerCase();
  const matches = members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  const rows: (MemberOption | null)[] = allowNone && !q ? [null, ...matches] : matches;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    setQuery("");
    const i = rows.findIndex((r) => (r?.id ?? null) === value);
    setActive(Math.max(0, i));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    button.current?.focus();
  };
  const pick = (row: MemberOption | null | undefined) => {
    if (row === undefined) return;
    onChange(row?.id ?? null);
    close();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };
  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, rows.length - 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(rows.length - 1);
    else if (e.key === "Enter") pick(rows[active]);
    else if (e.key === "Escape") close();
    else if (e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
  };

  const h = size === "sm" ? "h-10 text-[14px]" : "h-11 text-[15px]";

  return (
    <div ref={root} className="relative min-w-0">
      <button
        ref={button}
        id={baseId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? `${label}: ${selected.name}` : label}
        aria-describedby={describedBy}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onButtonKey}
        className={`flex w-full min-w-0 items-center gap-2.5 rounded-ctl border bg-surface pl-2.5 pr-3 text-left transition-[border-color,box-shadow] duration-150 focus-visible:!rounded-ctl disabled:cursor-not-allowed disabled:opacity-60 ${h} ${
          invalid ? "border-priority-high" : open ? "border-signal shadow-[0_0_0_3px_var(--signal-soft)]" : "border-line-2 hover:border-ink-4"
        }`}
      >
        {selected ? (
          <Avatar name={selected.name} id={selected.email} src={selected.imageUrl} size="sm" />
        ) : (
          <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-line-2" aria-hidden />
        )}
        <span className={`min-w-0 flex-1 truncate font-medium ${selected ? "text-ink" : "text-ink-4"}`}>
          {selected ? selected.name : value ? "Someone who left" : allowNone ? noneLabel : placeholder}
        </span>
        <CaretDown size={14} weight="bold" aria-hidden className={`shrink-0 text-ink-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-full min-w-[260px] max-w-[calc(100vw-32px)] rounded-card border border-line bg-surface p-1.5 shadow-warm-3 motion-safe:animate-[fadeUp_0.14s_var(--ease-out)_both]">
          <div className="relative">
            <MagnifyingGlass size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              ref={search}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${baseId}-list`}
              aria-activedescendant={rows.length ? `${baseId}-opt-${active}` : undefined}
              aria-label={`Search people for ${label.toLowerCase()}`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder="Search by name or email"
              autoComplete="off"
              className="h-10 w-full rounded-[12px] bg-bg-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-4 focus-visible:!rounded-[12px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-soft)]"
            />
          </div>
          <ul ref={list} id={`${baseId}-list`} role="listbox" aria-label={label} className="mt-1.5 max-h-64 overflow-y-auto">
            {rows.length === 0 ? (
              <li className="px-3 py-3 text-[14px] text-ink-3" role="presentation">
                No one matches &ldquo;{query.trim()}&rdquo;.
              </li>
            ) : (
              rows.map((m, i) => {
                const isSel = (m?.id ?? null) === value;
                return (
                  <li
                    key={m?.id ?? "none"}
                    id={`${baseId}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(m)}
                    className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[12px] px-2.5 text-[14px] ${
                      i === active ? "bg-bg-2 text-ink" : "text-ink-2"
                    }`}
                  >
                    {m ? (
                      <Avatar name={m.name} id={m.email} src={m.imageUrl} size="sm" />
                    ) : (
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-dashed border-line-2 text-ink-3" aria-hidden>
                        <X size={12} weight="bold" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate ${isSel ? "font-semibold" : "font-medium"}`}>
                        {m ? m.name : noneLabel}
                        {m?.isYou ? <span className="font-normal text-ink-3"> (you)</span> : null}
                      </span>
                      {m ? <span className="block truncate text-[12.5px] text-ink-3">{m.email}</span> : null}
                    </span>
                    <Check size={14} weight="bold" aria-hidden className={`shrink-0 text-signal ${isSel ? "" : "invisible"}`} />
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** A person's face and name in a list, or a quiet line when they are not in the member list. */
export function PersonLine({ member, fallback = "Not in the workspace" }: { member: MemberOption | null | undefined; fallback?: string }) {
  if (!member)
    return (
      <span className="inline-flex min-w-0 items-center gap-2 text-ink-3">
        <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-line-2" aria-hidden />
        <span className="truncate">{fallback}</span>
      </span>
    );
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={member.name} id={member.email} src={member.imageUrl} size="sm" />
      <span className="truncate font-medium text-ink">{member.name}</span>
    </span>
  );
}
