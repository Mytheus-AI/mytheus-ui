"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { CaretDown, Check, MagnifyingGlass, X } from "@phosphor-icons/react";
import { Avatar } from "./Avatar";

/** A workspace member as a picker shows them. */
export type MemberOption = {
  /** `users.id` */
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  isYou: boolean;
};

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
        className={`flex w-full min-w-0 items-center gap-2.5 rounded-ctl border bg-surface pl-2.5 pr-3 text-left transition-[border-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${h} ${
          invalid ? "border-priority-high" : open ? "border-signal shadow-[0_0_0_3px_var(--signal-soft)]" : "border-line-2 hover:border-ink-4"
        }`}
      >
        {selected ? (
          <Avatar name={selected.name} id={selected.email} src={selected.imageUrl} size="sm" />
        ) : (
          <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-line-2" aria-hidden />
        )}
        <span className={`min-w-0 flex-1 truncate font-medium ${selected ? "text-ink" : "text-ink-3"}`}>
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
              className="h-10 w-full rounded-ctl bg-bg-2 pl-9 pr-3 text-[14px] text-ink placeholder:text-ink-3 "
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
                    className={`flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-ctl px-2.5 text-[14px] ${
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
