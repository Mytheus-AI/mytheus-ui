"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { CaretDown, Check } from "@phosphor-icons/react";
import {
  drawOrder,
  groupOptions,
  lastEnabled,
  firstEnabled,
  openingIndex,
  placePanel,
  stepEnabled,
  typeaheadMatch,
  type Placement,
} from "@/lib/dropdown";

/* The one dropdown of the app. Every choice from a list goes through it: a native select opens
   the operating system's menu, which ignores the tokens (a white list with a blue highlight on
   the dark theme) and cannot be made to match. The regression guard is
   tests/no-native-select.test.ts (and an ESLint rule in .eslintrc.json).

   Semantics (WAI-ARIA APG, select-only combobox): the trigger is a <button> with
   role="combobox", aria-haspopup="listbox", aria-expanded and, while open, aria-controls and
   aria-activedescendant naming the active option. Focus never leaves the trigger, so a parent
   popover or dialog that closes when focus leaves it stays open.

   Keyboard: Down, Up, Enter, Space or a letter open it; arrows, Home, End, Page Up/Down move;
   typing jumps to a match; Enter or Space picks; Escape closes without changing (and does not
   close the dialog around it); Tab picks the active option and moves on, as the APG pattern does.

   Placement: the panel is a top-layer popover (`popover="manual"`), so a dialog's overflow, a
   transformed parent or a stacking context never clips it, and it is still a DOM child of the
   trigger's wrapper, so "click outside" and "focus left" checks see it as inside. It opens below
   the trigger, flips above when there is more room there, and follows scrolling. On a phone it
   opens as a bottom sheet with large rows. Motion: a 160 ms settle (a slide up for the sheet),
   none under reduced motion.

   Forms: `name` adds a hidden input carrying the value; `id` lets a visible <label htmlFor>
   name and open it. `label` is always the accessible name of the trigger and the list. */

export type DropdownOption<T extends string = string> = {
  value: T;
  label: string;
  /** A second, quieter line under the label. */
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** Options that share a group are drawn together under its name, in first-seen order. */
  group?: string;
  /** What the trigger shows when this is chosen, when shorter than `label`. */
  short?: string;
};

export type DropdownProps<T extends string> = {
  value: T | null | undefined;
  onChange: (value: T) => void;
  options: ReadonlyArray<DropdownOption<T>>;
  /** The accessible name of the trigger and the list, and the sheet's title on a phone. */
  label: string;
  /** The trigger's id, for a visible <label htmlFor>. */
  id?: string;
  /** Names the trigger by another element instead of `label`. */
  labelledBy?: string;
  describedBy?: string;
  /** Adds a hidden input with this name, for forms. */
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** sm 36 px, md 40 px, lg 44 px (the form field height). */
  size?: "sm" | "md" | "lg";
  /** field: bordered surface (forms); soft: a filled well; ghost: no fill until hovered. */
  tone?: "field" | "soft" | "ghost";
  /** control: the 12 px control radius (forms); round: a pill (toolbars and filters). */
  shape?: "control" | "round";
  align?: "start" | "end";
  /** On a phone, open as a bottom sheet (default) or always as a panel. */
  sheet?: "auto" | "never";
  /** Panel at least as wide as the trigger (default). */
  matchWidth?: boolean;
  /** An icon before the value on the trigger (the chosen option's own icon wins). */
  icon?: ReactNode;
  /** Draws the trigger's value; defaults to the option's `short` or `label`. */
  renderValue?: (option: DropdownOption<T> | null) => ReactNode;
  /** Said when there are no options at all. */
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  /** Extra width on the panel, for long labels in a narrow trigger. */
  panelMinWidth?: number;
};

const SHEET_QUERY = "(max-width: 639.98px)";
// Placement must land before paint in the browser; on the server there is nothing to place.
const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const TYPE_RESET_MS = 600;

function supportsPopover(el: HTMLElement | null): el is HTMLElement & { showPopover: () => void; hidePopover: () => void } {
  return Boolean(el && typeof (el as { showPopover?: unknown }).showPopover === "function");
}

function useSheet(enabled: boolean): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(SHEET_QUERY);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [enabled]);
  return enabled && narrow;
}

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  label,
  id,
  labelledBy,
  describedBy,
  name,
  placeholder = "Choose",
  disabled = false,
  invalid = false,
  size = "lg",
  tone = "field",
  shape = "control",
  align = "start",
  sheet: sheetMode = "auto",
  matchWidth = true,
  icon,
  renderValue,
  emptyText = "Nothing to choose from",
  className = "",
  triggerClassName = "",
  panelMinWidth = 0,
}: DropdownProps<T>) {
  const auto = useId();
  const triggerId = id ?? `${auto}-trigger`;
  const listId = `${auto}-list`;
  const optId = (i: number) => `${auto}-opt-${i}`;

  const items = useMemo(() => drawOrder(options), [options]);
  const groups = useMemo(() => groupOptions(items), [items]);
  const selectedIndex = items.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? items[selectedIndex] : null;
  const inert = disabled || items.length === 0;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<Placement | null>(null);
  const sheet = useSheet(sheetMode === "auto");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const close = useCallback(() => {
    setOpen(false);
    setPlace(null);
  }, []);

  const openAt = useCallback(
    (i: number) => {
      if (inert) return;
      setActive(i);
      setOpen(true);
    },
    [inert],
  );

  const pick = useCallback(
    (i: number) => {
      const o = items[i];
      if (!o || o.disabled) return;
      if (o.value !== value) onChange(o.value);
      close();
    },
    [items, value, onChange, close],
  );

  // Show it in the top layer, then measure and place it next to the trigger (or as a sheet).
  const reposition = useCallback(() => {
    const t = trigger.current;
    const p = panel.current;
    if (!t || !p || sheet) return;
    const r = t.getBoundingClientRect();
    // Scrolled out of view inside its container: a floating list with nothing to point at is
    // confusing, so it closes, as a native select does.
    if (r.bottom < 0 || r.top > window.innerHeight) {
      close();
      return;
    }
    const natural = list.current?.scrollHeight ?? p.scrollHeight;
    setPlace(
      placePanel(
        { top: r.top, left: r.left, width: r.width, height: r.height },
        { width: Math.max(p.scrollWidth, panelMinWidth), height: natural + 12 },
        { width: window.innerWidth, height: window.innerHeight },
        { align, matchWidth },
      ),
    );
  }, [sheet, align, matchWidth, panelMinWidth, close]);

  useBrowserLayoutEffect(() => {
    if (!open) return;
    const p = panel.current;
    if (p && supportsPopover(p)) {
      p.setAttribute("popover", "manual");
      try {
        p.showPopover();
      } catch {
        // Already showing.
      }
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      // A press on a sheet's backdrop is delivered to the panel itself, above its top edge.
      if (sheet && panel.current && target === panel.current) {
        const top = panel.current.getBoundingClientRect().top;
        if (e.clientY < top) close();
        return;
      }
      if (root.current && !root.current.contains(target)) close();
    };
    const onMove = () => reposition();
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, sheet, close, reposition]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, place]);

  // Losing the options (a reload of the list) or being disabled closes it.
  useEffect(() => {
    if (inert && open) close();
  }, [inert, open, close]);

  const jump = (key: string, from: number) => {
    const now = Date.now();
    typed.current.text = now - typed.current.at > TYPE_RESET_MS ? key : typed.current.text + key;
    typed.current.at = now;
    return typeaheadMatch(items, typed.current.text, from);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (inert) return;
    // Any key that is not a character (an arrow, Home, Enter) ends a type-to-jump search, so a
    // Space after moving with the arrows picks instead of searching for " ".
    if (e.key.length !== 1) typed.current = { text: "", at: 0 };
    const typing = now() - typed.current.at <= TYPE_RESET_MS && typed.current.text.length > 0;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openAt(openingIndex(items, selectedIndex));
      } else if (e.key === "Home") {
        e.preventDefault();
        openAt(firstEnabled(items));
      } else if (e.key === "End") {
        e.preventDefault();
        openAt(lastEnabled(items));
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = jump(e.key, selectedIndex);
        if (i >= 0) {
          e.preventDefault();
          openAt(i);
        }
      }
      return;
    }
    switch (e.key) {
      case "Escape":
        // Closes the list only: never the dialog or popover it sits in.
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case "Tab":
        if (active >= 0) pick(active);
        else close();
        return;
      case "ArrowDown":
        e.preventDefault();
        if (e.altKey) return;
        setActive((a) => stepEnabled(items, a, 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        if (e.altKey) {
          if (active >= 0) pick(active);
          return;
        }
        setActive((a) => stepEnabled(items, a, -1));
        return;
      case "PageDown":
        e.preventDefault();
        setActive((a) => stepEnabled(items, a, 1, 10));
        return;
      case "PageUp":
        e.preventDefault();
        setActive((a) => stepEnabled(items, a, -1, 10));
        return;
      case "Home":
        e.preventDefault();
        setActive(firstEnabled(items));
        return;
      case "End":
        e.preventDefault();
        setActive(lastEnabled(items));
        return;
      case "Enter":
        e.preventDefault();
        if (active >= 0) pick(active);
        return;
      case " ":
        e.preventDefault();
        if (typing) {
          const i = jump(" ", active);
          if (i >= 0) setActive(i);
          return;
        }
        if (active >= 0) pick(active);
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          const i = jump(e.key, active);
          if (i >= 0) setActive(i);
        }
    }
  };

  const shown = renderValue ? renderValue(selected) : selected ? selected.short ?? selected.label : null;
  const leadIcon = selected?.icon ?? icon;
  const panelStyle: CSSProperties | undefined =
    !sheet && place ? { top: place.top, left: place.left, width: place.width, maxHeight: place.maxHeight } : undefined;

  return (
    <div ref={root} className={`dd ${className}`} data-size={size} data-tone={tone} data-shape={shape}>
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
      <button
        ref={trigger}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? optId(active) : undefined}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        disabled={inert}
        title={selected ? selected.label : undefined}
        className={`dd-trigger tap ${triggerClassName}`}
        data-open={open || undefined}
        data-placeholder={selected ? undefined : true}
        onClick={() => (open ? close() : openAt(openingIndex(items, selectedIndex)))}
        onKeyDown={onKeyDown}
        // A button clicks itself when Space comes back up; the keydown already acted.
        onKeyUp={(e) => {
          if (e.key === " ") e.preventDefault();
        }}
        onBlur={(e) => {
          // Focus left for good (not into the panel, which never takes focus).
          if (open && !root.current?.contains(e.relatedTarget as Node | null)) close();
        }}
      >
        {leadIcon ? (
          <span className="dd-lead" aria-hidden="true">
            {leadIcon}
          </span>
        ) : null}
        <span className="dd-value">{shown ?? (items.length === 0 ? emptyText : placeholder)}</span>
        <CaretDown size={14} weight="bold" aria-hidden="true" className="dd-caret" />
      </button>

      {open ? (
        <div
          ref={panel}
          className={`dd-panel${sheet ? " is-sheet" : ""}`}
          data-side={place?.side ?? "bottom"}
          data-placed={sheet || place ? true : undefined}
          style={panelStyle}
          // Never take focus from the trigger, and never let a wrapping <label> re-open it.
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => e.preventDefault()}
        >
          {sheet ? (
            <div className="dd-sheet-head" aria-hidden="true">
              <span className="dd-grip" />
              <span className="dd-sheet-title">{label}</span>
            </div>
          ) : null}
          <div ref={list} id={listId} role="listbox" aria-label={label} className="dd-list">
            {groups.map((g, gi) => {
              const rows = g.items.map(({ option: o, index: i }) => {
                const isSel = i === selectedIndex;
                return (
                  <div
                    key={`${o.value}-${i}`}
                    id={optId(i)}
                    data-index={i}
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={o.disabled || undefined}
                    title={o.label}
                    className="dd-opt"
                    data-active={i === active || undefined}
                    onPointerMove={() => {
                      if (!o.disabled && active !== i) setActive(i);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      pick(i);
                    }}
                  >
                    {o.icon ? (
                      <span className="dd-opt-icon" aria-hidden="true">
                        {o.icon}
                      </span>
                    ) : null}
                    <span className="dd-opt-text">
                      <span className="dd-opt-label">{o.label}</span>
                      {o.description ? <span className="dd-opt-desc">{o.description}</span> : null}
                    </span>
                    <Check size={16} weight="bold" aria-hidden="true" className="dd-check" />
                  </div>
                );
              });
              if (g.group === null) return <Fragment key={`${auto}-g${gi}`}>{rows}</Fragment>;
              const gid = `${auto}-g${gi}`;
              return (
                <div key={gid} role="group" aria-labelledby={gid} className="dd-group">
                  <div id={gid} className="dd-group-label">
                    {g.group}
                  </div>
                  {rows}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function now(): number {
  return Date.now();
}
