"use client";

import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { X } from "@phosphor-icons/react";
import { cleanList, splitItems } from "@/lib/api/profile-types";

/* A list of short topics typed as chips: Enter or a comma adds what was typed, a paste with
   commas or new lines adds each part, Backspace in the empty field takes the last chip back into
   the field to edit. Leaving the field keeps what was typed, so nothing is lost on Save. Every
   chip has its own remove button, and each change is read out by a polite live region. Tokens
   only, so it works on the auth pages and in both app themes. */

export function ChipInput({
  id,
  value,
  onChange,
  max,
  itemMax = 100,
  placeholder,
  describedBy,
  invalid,
  noun = "topic",
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  /** how many chips the list may hold */
  max: number;
  /** characters per chip */
  itemMax?: number;
  placeholder?: string;
  /** id of the help or error text under the field */
  describedBy?: string;
  invalid?: boolean;
  /** what one chip is, for announcements ("focus area", "topic") */
  noun?: string;
}) {
  const [draft, setDraft] = useState("");
  const [announce, setAnnounce] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const countId = useId();
  const full = value.length >= max;

  const add = (parts: string[]) => {
    const before = value.length;
    const next = cleanList([...value, ...parts.map((p) => p.slice(0, itemMax))]).slice(0, max);
    const added = next.slice(before);
    if (added.length) {
      onChange(next);
      setAnnounce(added.length === 1 ? `Added ${added[0]}.` : `Added ${added.length} ${noun}s.`);
    } else if (parts.some((p) => p.trim())) {
      setAnnounce(full ? `The list is full at ${max}.` : "Already in the list.");
    }
  };

  const commit = () => {
    if (!draft.trim()) return;
    add(splitItems(draft));
    setDraft("");
  };

  const remove = (i: number) => {
    const gone = value[i];
    onChange(value.filter((_, j) => j !== i));
    setAnnounce(`Removed ${gone}.`);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (!draft.trim()) {
        if (e.key === ",") e.preventDefault();
        return; // an empty Enter submits the form as usual
      }
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      const last = value[value.length - 1];
      onChange(value.slice(0, -1));
      setDraft(last);
      setAnnounce(`Editing ${last}.`);
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!/[,\n]/.test(text)) return;
    e.preventDefault();
    add(splitItems(draft + text));
    setDraft("");
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className={`flex min-h-11 w-full cursor-text flex-wrap items-center gap-1.5 rounded-ctl border bg-surface px-2 py-1.5 transition-[border-color,box-shadow] duration-150 focus-within:border-signal focus-within:shadow-[0_0_0_4px_var(--signal-soft)] ${
          invalid ? "border-priority-high" : "border-line-2 hover:border-ink-4"
        }`}
      >
        {value.length > 0 ? (
          // role="list" keeps the list semantics that `display: contents` drops in Safari
          // eslint-disable-next-line jsx-a11y/no-redundant-roles
          <ul role="list" className="contents" aria-label={`Added, ${value.length} of ${max}`}>
            {value.map((item, i) => (
              <li
                key={item}
                className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-bg-2 py-0.5 pl-3 pr-0.5 text-[14px] font-medium text-ink"
              >
                <span className="truncate">{item}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(i);
                  }}
                  aria-label={`Remove ${item}`}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink focus-visible:!rounded-full"
                >
                  <X size={13} weight="bold" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            const v = e.target.value;
            // a comma typed on a phone keyboard arrives here, not as a keydown
            if (v.includes(",")) {
              add(splitItems(v));
              setDraft("");
            } else setDraft(v.slice(0, itemMax));
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={commit}
          placeholder={full ? `That's the most, ${max}` : value.length ? "Add another" : placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={[describedBy, countId].filter(Boolean).join(" ")}
          enterKeyHint="enter"
          autoComplete="off"
          className="h-8 min-w-[9rem] flex-1 bg-transparent px-1.5 text-[15px] text-ink placeholder:text-ink-4 focus-visible:outline-none"
        />
      </div>
      <p id={countId} className="sr-only">
        {value.length} of {max} added. Press Enter or type a comma to add.
      </p>
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
