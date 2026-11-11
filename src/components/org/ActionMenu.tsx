"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { DotsThree } from "@phosphor-icons/react";

/* A small "more" menu for a row or a card head (People: a department's and a team's edit menu).
   The same menu-button pattern as the account menu: Enter, Space or Down opens it on the first
   item, Up on the last; arrows move, Home/End jump, Escape or Tab closes and focus returns to the
   button. Picking an item closes the menu and refocuses the button first, so a dialog it opens
   takes focus from the button and gives it back there. */

export type ActionMenuItem = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
};

export function ActionMenu({
  label,
  items,
  size = "md",
}: {
  /** names the button, e.g. "Edit Engineering" */
  label: string;
  items: ActionMenuItem[];
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  const id = useId();

  const list = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []);

  useEffect(() => {
    if (!open) return;
    const all = list();
    (focusOnOpen.current === "last" ? all[all.length - 1] : all[0])?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = list();
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      all[(at + step + all.length) % all.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      all[e.key === "Home" ? 0 : all.length - 1]?.focus();
    }
  };

  /* focus goes back to the menu button first, so a dialog the item opens records the button as
     its opener and returns focus there on close */
  const select = (item: ActionMenuItem) => {
    close(true);
    item.onSelect();
  };

  const box = size === "sm" ? "h-10 w-10" : "h-10 w-10 sm:h-11 sm:w-11";

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label}
        title={label}
        onClick={() => {
          focusOnOpen.current = "first";
          setOpen((o) => !o);
        }}
        onKeyDown={onButtonKey}
        className={`grid ${box} place-items-center rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink aria-expanded:bg-bg-2 aria-expanded:text-ink`}
      >
        <DotsThree size={20} weight="bold" aria-hidden />
      </button>
      {open ? (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKey}
          className="mx-pop absolute right-0 top-[calc(100%+6px)] z-[60] w-[min(260px,calc(100vw-32px))] rounded-card border border-line bg-surface p-1.5 shadow-warm-3"
        >
          {items.map((item, i) => {
            const danger = item.tone === "danger";
            return (
              <div key={item.label} className={danger && i > 0 ? "mt-1 border-t border-line pt-1" : undefined}>
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item.disabled}
                  onClick={() => select(item)}
                  onKeyDown={(e) => {
                    // handled on keydown so the key cannot also activate the menu button that
                    // focus returns to (which would reopen the menu over the dialog)
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!item.disabled) select(item);
                    }
                  }}
                  className={`flex h-11 w-full items-center gap-3 rounded-ctl px-3 text-left text-[14px] font-semibold transition-colors disabled:opacity-50 ${
                    danger
                      ? "text-priority-high hover:bg-priority-high-soft focus-visible:bg-priority-high-soft"
                      : "text-ink-2 hover:bg-bg-2 hover:text-ink focus-visible:bg-bg-2 focus-visible:text-ink"
                  }`}
                >
                  {item.icon ? (
                    <span aria-hidden className={`inline-flex shrink-0 ${danger ? "" : "text-ink-3"}`}>
                      {item.icon}
                    </span>
                  ) : null}
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
