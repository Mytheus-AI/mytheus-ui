"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import { ArrowUp, CalendarBlank, CaretDown, Check, FileText, Microphone, Paperclip, Stop, User, VideoCamera, X, Scales, Globe } from "@phosphor-icons/react";
import { myteMentions } from "@/app/actions/myte-threads";
import { applyMention, expandShortcut, matchShortcuts, mentionAt, rankMentions, type Mentionable, type Shortcut } from "@/lib/ask-myte/compose";
import { scopeLabel, scopeShortLabel } from "@/lib/ask-myte/page-context";
import { ALL_SCOPE, LIMITS, type AskScope, type ScopeKind } from "@/lib/ask-myte/types";
import { ACCEPT, MAX_FILE_BYTES, PASTE_ATTACH_FROM, acceptsFile, addAttachment, pastedName, sizeLabel, totalChars, type PendingAttachment } from "@/lib/ask-myte/attachments";
import { useSpeechInput } from "./voice";

/* The ask box (the approved plan, "The ask box"; layout option A, November 2026): a full-width
   field that grows with what you type (Enter sends, Shift+Enter is a new line, Up on an empty box
   brings back your last question), attachments as chips above it, and one toolbar row below it:
   the scope as a single button with a menu (All of Mytheus, a meeting, a person, as of a date,
   each opening its picker) and a clear, then attach, mic and send, `@` mentions
   of meetings, people and decisions with type-ahead from what you can already see, the shortcuts
   /prep /recap /owe /asof /draft, the mic where the browser can listen, and Send that turns into
   Stop while an answer streams.

   Suggestions (mentions, shortcuts) follow the listbox pattern: focus stays in the field, Up/Down
   move the highlighted option (`aria-activedescendant`), Enter or Tab picks it, Escape closes it
   first (and only then reaches the sheet, which stops the answer and then closes). */

let mentionCache: Promise<Mentionable[]> | null = null;
function loadMentions(): Promise<Mentionable[]> {
  mentionCache ??= myteMentions().catch(() => {
    mentionCache = null;
    return [];
  });
  return mentionCache;
}

const KIND_ICON = { meeting: VideoCamera, person: User, decision: Scales } as const;

type Suggest = { kind: "mention"; at: { start: number; query: string }; items: Mentionable[] } | { kind: "slash"; items: Shortcut[] };

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  /** a question to send, already expanded from any shortcut */
  onSubmit: (question: string) => void;
  streaming: boolean;
  onStop: () => void;
  scope: AskScope;
  onScope: (s: AskScope) => void;
  /** the page the sheet opened on: the scope button shows it (`short`, "This meeting"), with a clear */
  pageChip?: { label: string; short?: string; kind?: "meeting" | "decision" | "person" | null; onRemove: () => void } | null;
  inputRef: RefObject<HTMLTextAreaElement>;
  lastQuestion: string | null;
  placeholder: string;
  offline: boolean;
  compact?: boolean;
  onFocusChange?: (focused: boolean) => void;
  /** names the field for screen readers */
  label: string;
  /** ADR-0049 F7: files and pasted text going with the next question */
  attachments?: PendingAttachment[];
  onAttachments?: (list: PendingAttachment[]) => void;
  /** ADR-0049 F5: the /routine shortcut opens the routine form with this question */
  onRoutine?: (question: string) => void;
}

let fileSeq = 0;

export function Composer({
  value,
  onChange,
  onSubmit,
  streaming,
  onStop,
  scope,
  onScope,
  pageChip = null,
  inputRef,
  lastQuestion,
  placeholder,
  offline,
  compact = false,
  onFocusChange,
  label,
  attachments = [],
  onAttachments,
  onRoutine,
}: ComposerProps) {
  const uid = useId();
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [active, setActive] = useState(0);
  const [picker, setPicker] = useState<ScopeKind | null>(null);
  const [pasted, setPasted] = useState(false);
  const caret = useRef(0);
  const speechBase = useRef("");
  const heldSince = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileNote, setFileNote] = useState<{ text: string; undoPaste?: string } | null>(null);
  const [sendNote, setSendNote] = useState<string | null>(null);
  const attachRef = useRef(attachments);
  attachRef.current = attachments;

  const attachText = (file: { name: string; text: string; type?: string; size?: number }): boolean => {
    if (!onAttachments) return false;
    const res = addAttachment(attachRef.current, file, `f${Date.now().toString(36)}${fileSeq++}`);
    if (!res.ok) {
      setFileNote({ text: res.message });
      return false;
    }
    attachRef.current = res.list;
    onAttachments(res.list);
    return true;
  };

  const attachFiles = async (files: FileList | File[]) => {
    setFileNote(null);
    for (const f of Array.from(files)) {
      if (!acceptsFile(f.name, f.type)) {
        setFileNote({ text: `${f.name} isn't a text file. Attach .txt, .md or .csv.` });
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        setFileNote({ text: `${f.name} is too large to attach.` });
        continue;
      }
      const text = await f.text().catch(() => null);
      if (text === null) {
        setFileNote({ text: `${f.name} couldn't be read.` });
        continue;
      }
      attachText({ name: f.name, text, type: f.type, size: f.size });
    }
  };

  const speech = useSpeechInput((text) => {
    onChange(`${speechBase.current}${speechBase.current && text ? " " : ""}${text}`.slice(0, LIMITS.question));
  });

  // Grow with the text, up to six lines on the page and four in the sheet. No scrollbar while it
  // fits (rounding can leave a 1 px overflow, which drew a native thumb); past the limit it
  // scrolls with the app's thin scrollbar.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const line = parseFloat(cs.lineHeight) || (compact ? 24 : 26);
    const pad = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const max = Math.round(line * (compact ? 4 : 6) + pad);
    el.style.overflowY = "hidden";
    el.style.height = "auto";
    const full = el.scrollHeight;
    el.style.height = `${Math.min(full, max)}px`;
    el.style.overflowY = full > max + 1 ? "auto" : "hidden";
  }, [value, inputRef, compact]);

  const refreshSuggest = useCallback(
    async (text: string, at: number) => {
      const slash = matchShortcuts(text);
      if (slash && slash.length) {
        setSuggest({ kind: "slash", items: slash });
        setActive(0);
        return;
      }
      const m = mentionAt(text, at);
      if (!m) {
        setSuggest(null);
        return;
      }
      const all = await loadMentions();
      // The text may have moved on while the list loaded.
      const now = inputRef.current;
      if (!now || mentionAt(now.value, now.selectionStart ?? now.value.length)?.start !== m.start) return;
      const items = rankMentions(m.query, all);
      setSuggest(items.length ? { kind: "mention", at: m, items } : null);
      setActive(0);
    },
    [inputRef],
  );

  const pick = (i: number) => {
    if (!suggest) return;
    if (suggest.kind === "slash") {
      const s = suggest.items[i];
      if (!s) return;
      onChange(`/${s.name} `);
      setSuggest(null);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    const m = suggest.items[i];
    if (!m) return;
    const next = applyMention(value, suggest.at, m.label);
    onChange(next.text);
    setSuggest(null);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  };

  const submit = () => {
    const text = value.trim();
    if (streaming) return;
    // Send stays pressable when it cannot send, and says why.
    if (offline) {
      setSendNote("You're offline. I'll be ready when you're back.");
      return;
    }
    if (!text) {
      setSendNote(speech.supported ? "Type a question first, or use the mic to ask by voice." : "Type a question first.");
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    setSendNote(null);
    const short = expandShortcut(text);
    if (short?.picker === "as_of") {
      onChange(short.question);
      setPicker("as_of");
      return;
    }
    if (short?.picker === "routine") {
      if (onRoutine) {
        onRoutine(short.question);
        onChange("");
      }
      return;
    }
    setSuggest(null);
    setPasted(false);
    onSubmit(short ? short.question : text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (suggest) {
      const n = suggest.items.length;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % n);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + n) % n);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        pick(active);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setSuggest(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "ArrowUp" && !value && lastQuestion) {
      e.preventDefault();
      onChange(lastQuestion);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) el.setSelectionRange(el.value.length, el.value.length);
      });
    }
  };

  const listId = `${uid}-suggest`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const hintId = `${uid}-hint`;
  const canSend = !!value.trim() && !offline;
  const chars = totalChars(attachments);

  const micDown = () => {
    if (speech.listening || speech.busy) return;
    heldSince.current = Date.now();
    speechBase.current = value.trim();
    speech.start();
  };
  const micUp = () => {
    // Held to talk: let go to stop. A quick press leaves it listening until pressed again.
    if (heldSince.current && Date.now() - heldSince.current > 450) speech.stop();
    heldSince.current = 0;
  };

  return (
    <div className="relative">
      {suggest ? (
        <div
          id={listId}
          role="listbox"
          aria-label={suggest.kind === "slash" ? "Shortcuts" : "Mention a meeting, person or decision"}
          className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-40 max-h-[280px] overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-warm-3"
        >
          {suggest.kind === "slash"
            ? suggest.items.map((s, i) => (
                <div
                  key={s.name}
                  id={optId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(i);
                  }}
                  onMouseMove={() => setActive(i)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl px-3 text-[14px] ${i === active ? "bg-bg-2 text-ink" : "text-ink-2"}`}
                >
                  <span className="w-16 shrink-0 font-semibold text-ink">{s.label}</span>
                  <span className="text-ink-3">{s.description}</span>
                </div>
              ))
            : suggest.items.map((m, i) => {
                const Icon = KIND_ICON[m.kind];
                return (
                  <div
                    key={`${m.kind}-${m.id}`}
                    id={optId(i)}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(i);
                    }}
                    onMouseMove={() => setActive(i)}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-ctl px-3 text-[14px] ${i === active ? "bg-bg-2 text-ink" : "text-ink-2"}`}
                  >
                    <Icon size={17} aria-hidden className={i === active ? "text-signal" : "text-ink-3"} />
                    <span className="min-w-0 flex-1 truncate">{m.label}</span>
                    <span className="sr-only">, {m.kind}</span>
                  </div>
                );
              })}
        </div>
      ) : null}

      {picker ? (
        <ScopePicker
          kind={picker}
          initial={scope}
          onClose={() => {
            setPicker(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          onPick={(s) => {
            onScope(s);
            setPicker(null);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
        />
      ) : null}

      <div
        onDragEnter={(e) => {
          if (onAttachments && Array.from(e.dataTransfer.types).includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragOver={(e) => {
          if (onAttachments && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={(e) => {
          if (!onAttachments) return;
          e.preventDefault();
          setDragging(false);
          void attachFiles(e.dataTransfer.files);
        }}
        data-composer={compact ? "sheet" : "page"}
        className={`relative rounded-hero border bg-surface shadow-warm-1 transition-[border-color,box-shadow] duration-150 focus-within:border-ink-4 focus-within:shadow-warm-2 ${
          dragging ? "border-dashed border-signal-line" : "border-line-2"
        } ${compact ? "px-2.5 pb-2 pt-2.5" : "px-3 pb-2.5 pt-3"}`}
      >
        {dragging ? (
          <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-hero bg-surface/90 text-[15px] font-semibold text-signal-ink">
            Drop .txt, .md or .csv files to attach
          </div>
        ) : null}
        {attachments.length ? (
          <div className="mb-1.5 px-1">
            <ul className="flex flex-wrap gap-1.5" aria-label="Attached to this question">
              {attachments.map((a) => (
                <li key={a.key} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-2 pl-3 pr-1 text-[13px] text-ink-2">
                  <FileText size={15} aria-hidden className="shrink-0 text-ink-3" />
                  <span className="min-w-0 truncate font-semibold text-ink">{a.name}</span>
                  <span className="shrink-0 text-ink-3">{sizeLabel(a.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onAttachments?.(attachments.filter((x) => x.key !== a.key));
                      setFileNote(null);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    aria-label={`Remove ${a.name}`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"
                  >
                    <X size={12} weight="bold" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-1 px-1 text-[12.5px] text-ink-3">
              {attachments.length} of {LIMITS.attachments} files, {chars.toLocaleString("en")} of {LIMITS.attachmentChars.toLocaleString("en")} characters. Only the names are kept with your history.
            </p>
          </div>
        ) : null}
        <label htmlFor={`${uid}-q`} className="sr-only">
          {label}
        </label>
        <textarea
          id={`${uid}-q`}
          ref={inputRef}
          rows={1}
          value={value}
          maxLength={LIMITS.question}
          placeholder={placeholder}
          aria-describedby={hintId}
          aria-controls={suggest ? listId : undefined}
          aria-activedescendant={suggest && suggest.items[active] ? optId(active) : undefined}
          data-ring="none"
          data-ask-input={compact ? "sheet" : "page"}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value.trim()) setSendNote(null);
            caret.current = e.target.selectionStart ?? e.target.value.length;
            void refreshSuggest(e.target.value, caret.current);
          }}
          onSelect={(e) => {
            const el = e.currentTarget;
            if ((el.selectionStart ?? 0) !== caret.current) {
              caret.current = el.selectionStart ?? 0;
              void refreshSuggest(el.value, caret.current);
            }
          }}
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files ?? []);
            if (files.length && onAttachments) {
              e.preventDefault();
              void attachFiles(files);
              return;
            }
            const text = e.clipboardData.getData("text");
            // Long text goes in as an attachment, so the question stays a question.
            if (onAttachments && text.length >= PASTE_ATTACH_FROM) {
              e.preventDefault();
              if (attachText({ name: pastedName(attachRef.current), text })) setFileNote({ text: `Attached the pasted text (${text.length.toLocaleString("en")} characters).`, undoPaste: text });
              return;
            }
            if (text.length > 400) setPasted(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => {
            onFocusChange?.(false);
            setTimeout(() => setSuggest(null), 120);
          }}
          className={`block w-full resize-none overflow-y-hidden bg-transparent px-1.5 py-1 leading-relaxed text-ink !outline-none placeholder:text-ink-3 ${compact ? "text-[15px]" : "text-[16px]"}`}
        />
        <p id={hintId} className="sr-only">
          Enter sends, Shift and Enter adds a line. Type @ to mention a meeting, person or decision, or / for shortcuts. Paste or drop a text file to attach it.
        </p>

        {pasted && value.length > 400 ? (
          <div className="mb-2 mt-1 flex flex-wrap items-center gap-2 rounded-ctl bg-surface-2 px-3 py-2 text-[13.5px] text-ink-2">
            <span className="flex-1">That&apos;s a long message.</span>
            <button
              type="button"
              className="font-semibold text-signal-ink underline-offset-4 hover:underline"
              onClick={() => {
                setPasted(false);
                onSubmit(`Does this conflict with any of our decisions?\n\n${value.trim()}`.slice(0, LIMITS.question));
              }}
            >
              Check it against our decisions
            </button>
          </div>
        ) : null}

        {fileNote ? (
          <div className="mb-2 flex flex-wrap items-center gap-2 rounded-ctl bg-surface-2 px-3 py-2 text-[13.5px] text-ink-2" role="status">
            <span className="min-w-0 flex-1">{fileNote.text}</span>
            {fileNote.undoPaste ? (
              <button
                type="button"
                className="font-semibold text-signal-ink underline-offset-4 hover:underline"
                onClick={() => {
                  const text = fileNote.undoPaste ?? "";
                  onAttachments?.(attachRef.current.filter((a) => a.text !== text));
                  onChange(`${value}${value ? "\n" : ""}${text}`.slice(0, LIMITS.question));
                  setFileNote(null);
                }}
              >
                Paste as text instead
              </button>
            ) : null}
            <button type="button" aria-label="Dismiss" onClick={() => setFileNote(null)} className="grid h-7 w-7 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink">
              <X size={12} weight="bold" aria-hidden />
            </button>
          </div>
        ) : null}

        {/* One toolbar row: the scope on the left; attach, mic and send on the right. Never wraps. */}
        <div className="mt-1.5 flex items-center gap-2" data-composer-toolbar="">
          <div className="flex min-w-0 flex-1 items-center" role="group" aria-label="What to look in">
            <ScopeMenu
              scope={scope}
              pageChip={pageChip}
              onScope={onScope}
              onPicker={setPicker}
              onDone={() => requestAnimationFrame(() => inputRef.current?.focus())}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onAttachments ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  tabIndex={-1}
                  aria-hidden
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files) void attachFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={attachments.length >= LIMITS.attachments}
                  aria-label="Attach a text file"
                  title="Attach .txt, .md or .csv (or drop it here)"
                  className={`${TOOL} text-ink-3 hover:bg-bg-2 hover:text-ink disabled:opacity-40`}
                >
                  <Paperclip size={18} aria-hidden />
                </button>
              </>
            ) : null}
            {speech.supported ? (
              <button
                type="button"
                aria-pressed={speech.listening}
                aria-busy={speech.busy || undefined}
                aria-label={speech.listening ? "Stop listening" : "Ask by voice"}
                title={speech.listening ? "Stop listening" : "Hold to ask by voice, or press to start"}
                onPointerDown={micDown}
                onPointerUp={micUp}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (speech.listening) speech.stop();
                    else if (!speech.busy) {
                      speechBase.current = value.trim();
                      speech.start();
                    }
                  }
                }}
                onClick={(e) => {
                  // Pointer presses are handled above; this keeps a stray click from double-toggling.
                  if (e.detail === 0) return;
                  if (speech.listening && !heldSince.current) speech.stop();
                }}
                className={`${TOOL} ${speech.listening ? "bg-signal-soft text-signal-ink" : "text-ink-3 hover:bg-bg-2 hover:text-ink"}`}
              >
                <Microphone size={18} weight={speech.listening ? "fill" : "regular"} aria-hidden />
              </button>
            ) : null}
            {streaming ? (
              <button type="button" onClick={onStop} aria-label="Stop the answer" title="Stop (Esc)" className={`${TOOL} bg-pill text-pill-on hover:bg-pill-2`}>
                <Stop size={14} weight="fill" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                aria-label="Send"
                aria-describedby={sendNote ? `${uid}-sendnote` : undefined}
                title={offline ? "You're offline" : canSend ? "Send (Enter)" : "Type a question to send"}
                data-ready={canSend ? "" : undefined}
                className={`${TOOL} ${canSend ? "bg-pill text-pill-on hover:bg-pill-2" : "border border-line-2 text-ink-3 hover:bg-bg-2 hover:text-ink-2"}`}
              >
                <ArrowUp size={16} weight="bold" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
      {sendNote ? (
        <p id={`${uid}-sendnote`} className="mt-1.5 px-3 text-[13px] text-ink-3" role="status">
          {sendNote}
        </p>
      ) : speech.listening || speech.busy || speech.note ? (
        <p className="mt-1.5 px-3 text-[13px] text-ink-3" role="status">
          {speech.listening ? "Listening. Pause, let go or press the mic again to stop." : speech.busy ? "Writing down what you said…" : speech.note}
        </p>
      ) : null}
    </div>
  );
}

/** The toolbar's icon buttons: a 32 px disc, with a 40 px hit area around it. */
const TOOL =
  "relative grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors before:absolute before:-inset-1 before:rounded-full before:content-['']";

type ScopeChoice = { kind: ScopeKind | "page"; label: string; icon: typeof Globe };

const CHOICES: ScopeChoice[] = [
  { kind: "all", label: "All of Mytheus", icon: Globe },
  { kind: "meeting", label: "A meeting", icon: VideoCamera },
  { kind: "person", label: "A person", icon: User },
  { kind: "as_of", label: "As of a date", icon: CalendarBlank },
];

const KIND_ICONS: Record<ScopeKind, typeof Globe> = { all: Globe, meeting: VideoCamera, person: User, as_of: CalendarBlank };

/* The scope as one button: what it looks in now, with a menu to change it (All of Mytheus, a
   meeting, a person, as of a date) and a clear button when it is narrowed. Menu button pattern:
   Enter, Space or Down opens it on the current choice; Up and Down move, Home and End jump;
   Enter or Space picks; Escape or Tab closes it and focus returns to the button. */
function ScopeMenu({
  scope,
  pageChip,
  onScope,
  onPicker,
  onDone,
}: {
  scope: AskScope;
  pageChip: ComposerProps["pageChip"];
  onScope: (s: AskScope) => void;
  onPicker: (k: ScopeKind) => void;
  onDone: () => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);

  const page = pageChip ?? null;
  const choices: ScopeChoice[] = page ? [{ kind: "page", label: page.short ?? page.label, icon: VideoCamera }, ...CHOICES] : CHOICES;
  const current = page ? 0 : Math.max(0, choices.findIndex((c) => c.kind === scope.kind));
  const narrowed = page !== null || scope.kind !== "all";
  const Icon = page ? (page.kind === "person" ? User : page.kind === "decision" ? Scales : VideoCamera) : KIND_ICONS[scope.kind];
  const text = page ? (page.short ?? page.label) : scopeShortLabel(scope);

  const openAt = (i: number) => {
    setActive(i);
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) requestAnimationFrame(() => button.current?.focus());
  };

  useEffect(() => {
    if (open) items.current[active]?.focus();
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (c: ScopeChoice) => {
    setOpen(false);
    if (c.kind === "page") {
      onDone();
      return;
    }
    if (page) page.onRemove();
    if (c.kind === "all") {
      onScope(ALL_SCOPE);
      onDone();
    } else onPicker(c.kind);
  };

  const onMenuKey = (e: React.KeyboardEvent) => {
    const n = choices.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % n);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + n) % n);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(choices[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="relative flex min-w-0 max-w-full items-center">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${uid}-menu` : undefined}
        aria-label={`Look in: ${page ? page.label : scopeLabel(scope)}. Change scope`}
        title={page ? page.label : scopeLabel(scope)}
        onClick={() => (open ? close(false) : openAt(current))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openAt(e.key === "ArrowUp" ? choices.length - 1 : current);
          }
        }}
        data-scope={page ? "page" : scope.kind}
        className={`inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 pl-2.5 text-[13px] font-semibold transition-colors ${
          narrowed ? "rounded-l-full bg-signal-soft pr-1.5 text-signal-ink hover:bg-[color:color-mix(in_srgb,var(--signal-soft)_80%,var(--signal))]" : "rounded-full pr-2 text-ink-2 hover:bg-bg-2 hover:text-ink"
        }`}
      >
        <Icon size={15} weight={narrowed ? "fill" : "regular"} aria-hidden className="shrink-0" />
        <span className="min-w-0 truncate">{text}</span>
        {narrowed ? null : <CaretDown size={12} weight="bold" aria-hidden className="shrink-0 text-ink-3" />}
      </button>
      {narrowed ? (
        <button
          type="button"
          onClick={() => {
            if (page) page.onRemove();
            else onScope(ALL_SCOPE);
            requestAnimationFrame(() => button.current?.focus());
          }}
          aria-label={`Clear ${text}: ask about all of Mytheus`}
          title="Back to all of Mytheus"
          className="grid h-8 w-7 shrink-0 place-items-center rounded-r-full bg-signal-soft pr-0.5 text-signal-ink transition-colors hover:bg-[color:color-mix(in_srgb,var(--signal-soft)_80%,var(--signal))]"
        >
          <X size={12} weight="bold" aria-hidden />
        </button>
      ) : null}
      {open ? (
        <div
          ref={menu}
          id={`${uid}-menu`}
          role="menu"
          aria-label="Where to look"
          onKeyDown={onMenuKey}
          className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-[248px] max-w-[calc(100vw-48px)] rounded-card border border-line bg-surface p-1.5 shadow-warm-3"
        >
          {choices.map((c, i) => {
            const on = i === current;
            const CIcon = c.icon;
            return (
              <div
                key={c.kind}
                ref={(el) => {
                  items.current[i] = el;
                }}
                role="menuitemradio"
                aria-checked={on}
                tabIndex={i === active ? 0 : -1}
                onClick={() => choose(c)}
                onMouseMove={() => i !== active && setActive(i)}
                className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-ctl px-2.5 text-[14px] outline-none ${i === active ? "bg-bg-2 text-ink" : "text-ink-2"}`}
              >
                <CIcon size={17} weight={on ? "fill" : "regular"} aria-hidden className={on ? "shrink-0 text-signal-ink" : "shrink-0 text-ink-3"} />
                <span className="min-w-0 flex-1 truncate">{c.label}</span>
                {on ? <Check size={15} weight="bold" aria-hidden className="shrink-0 text-signal-ink" /> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/* A meeting or person picker (type to filter, from what you can see), or a date for the time
   machine. A small dialog over the box: focus starts in its field and Escape returns it. */
function ScopePicker({ kind, initial, onPick, onClose }: { kind: ScopeKind; initial: AskScope; onPick: (s: AskScope) => void; onClose: () => void }) {
  const uid = useId();
  const [all, setAll] = useState<Mentionable[] | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [date, setDate] = useState(initial.kind === "as_of" && initial.as_of ? initial.as_of : "");
  const box = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    field.current?.focus();
    if (kind === "meeting" || kind === "person") void loadMentions().then(setAll);
  }, [kind]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const items = useMemo(() => (all ? rankMentions(q, all.filter((m) => m.kind === kind), 30) : []), [all, q, kind]);
  const title = kind === "meeting" ? "Ask about a meeting" : kind === "person" ? "Ask about a person" : "Ask as of a date";
  const optId = (i: number) => `${uid}-o-${i}`;

  const choose = (m: Mentionable) =>
    onPick(
      kind === "meeting"
        ? { kind: "meeting", meeting_id: m.id, person_id: null, as_of: null, label: m.label }
        : { kind: "person", meeting_id: null, person_id: m.id, as_of: null, label: m.label },
    );

  return (
    <div
      ref={box}
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      className="absolute bottom-[calc(100%+8px)] left-0 z-40 w-[min(420px,100%)] rounded-card border border-line bg-surface p-3 shadow-warm-3"
    >
      <p className="px-1 pb-2 text-[14px] font-semibold text-ink">{title}</p>
      {kind === "as_of" ? (
        <form
          className="flex flex-wrap items-end gap-2 px-1 pb-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (date) onPick({ kind: "as_of", meeting_id: null, person_id: null, as_of: date, label: null });
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor={`${uid}-d`} className="mb-1 block text-[13px] text-ink-3">
              What was true on
            </label>
            <input
              id={`${uid}-d`}
              ref={field}
              type="date"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="h-10 w-full rounded-ctl border border-line-2 bg-surface px-3 text-[15px] text-ink"
            />
          </div>
          <button type="submit" disabled={!date} className="h-10 rounded-ctl bg-pill px-4 text-[14px] font-semibold text-pill-on hover:bg-pill-2 disabled:opacity-40">
            Use this date
          </button>
        </form>
      ) : (
        <>
          <label htmlFor={`${uid}-s`} className="sr-only">
            {kind === "meeting" ? "Search your meetings" : "Search people"}
          </label>
          <input
            id={`${uid}-s`}
            ref={field}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, Math.max(0, items.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (items[active]) choose(items[active]);
              }
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${uid}-l`}
            aria-autocomplete="list"
            aria-activedescendant={items[active] ? optId(active) : undefined}
            placeholder={kind === "meeting" ? "Search your meetings" : "Search people"}
            autoComplete="off"
            className="h-10 w-full rounded-ctl border border-line-2 bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3"
          />
          <div id={`${uid}-l`} role="listbox" aria-label={kind === "meeting" ? "Meetings" : "People"} className="mt-1.5 max-h-[220px] overflow-y-auto">
            {all === null ? (
              <p className="px-2 py-3 text-[14px] text-ink-3">Loading</p>
            ) : items.length === 0 ? (
              <p className="px-2 py-3 text-[14px] text-ink-3">{q ? "Nothing matches that." : kind === "meeting" ? "No meetings to pick from yet." : "No people to pick from yet."}</p>
            ) : (
              items.map((m, i) => (
                <div
                  key={m.id}
                  id={optId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(m);
                  }}
                  onMouseMove={() => setActive(i)}
                  className={`flex min-h-10 cursor-pointer items-center rounded-ctl px-2.5 text-[14px] ${i === active ? "bg-bg-2 text-ink" : "text-ink-2"}`}
                >
                  <span className="truncate">{m.label}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
