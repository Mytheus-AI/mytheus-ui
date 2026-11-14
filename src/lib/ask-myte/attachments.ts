/**
 * Bring your own material (ADR-0049 F7): pasted text or dropped `.txt`, `.md` and `.csv` files,
 * at most 3 and 40,000 characters in total, sent with one question as `attachments: [{name,
 * text}]`. Only their names are stored with the message.
 *
 * The same checks run in the composer (so the person hears why a file was refused) and in the
 * stream route (so a hand-made request cannot exceed the limits).
 *
 * Pure, tested in tests/ask-myte-attachments.test.ts.
 */

import { LIMITS, type Attachment } from "./types.ts";

export const ACCEPT = ".txt,.md,.csv,text/plain,text/markdown,text/csv";
const EXT = /\.(txt|md|markdown|csv)$/i;
/** Pasting more than this into the box offers to attach it instead. */
export const PASTE_ATTACH_FROM = 1500;
/** A file larger than this is not read at all (a 40,000-character file is ~160 KB at most). */
export const MAX_FILE_BYTES = 1_000_000;

export interface PendingAttachment extends Attachment {
  /** stable key for React and removal */
  key: string;
  /** bytes as read (UTF-8), for the chip */
  size: number;
}

export function acceptsFile(name: string, type = ""): boolean {
  return EXT.test(name) || type === "text/plain" || type === "text/markdown" || type === "text/csv";
}

export function totalChars(list: readonly Pick<Attachment, "text">[]): number {
  return list.reduce((n, a) => n + a.text.length, 0);
}

/** "2.4 KB", "812 B", "1.1 MB". */
export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A name for pasted text: "Pasted text", then "Pasted text 2". */
export function pastedName(existing: readonly Pick<Attachment, "name">[]): string {
  const taken = new Set(existing.map((a) => a.name));
  if (!taken.has("Pasted text.txt")) return "Pasted text.txt";
  for (let i = 2; ; i++) if (!taken.has(`Pasted text ${i}.txt`)) return `Pasted text ${i}.txt`;
}

export type AddResult = { ok: true; list: PendingAttachment[] } | { ok: false; message: string };

/** Add one file's text to the list, or say in plain words why it can't go. */
export function addAttachment(list: readonly PendingAttachment[], file: { name: string; text: string; type?: string; size?: number }, key: string): AddResult {
  const name = file.name.trim().slice(0, 120) || "Untitled.txt";
  if (!acceptsFile(name, file.type)) return { ok: false, message: `${name} isn't a text file. Attach .txt, .md or .csv.` };
  if (list.length >= LIMITS.attachments) return { ok: false, message: `You can attach up to ${LIMITS.attachments} files to one question.` };
  const text = file.text.replace(/\r\n?/g, "\n");
  if (!text.trim()) return { ok: false, message: `${name} is empty.` };
  const room = LIMITS.attachmentChars - totalChars(list);
  if (text.length > room) {
    return {
      ok: false,
      message:
        room <= 0
          ? `That's the ${LIMITS.attachmentChars.toLocaleString("en")} character limit for one question.`
          : `${name} is too long: ${text.length.toLocaleString("en")} characters, and ${room.toLocaleString("en")} are left of the ${LIMITS.attachmentChars.toLocaleString("en")} for one question.`,
    };
  }
  const size = file.size ?? new TextEncoder().encode(text).length;
  return { ok: true, list: [...list, { key, name, text, size }] };
}

/**
 * The stream route's check of what the browser sent: at most 3, each with a name and some text,
 * 40,000 characters in total. Anything else is refused with a message, never trimmed silently.
 */
export function checkAttachments(raw: unknown): { ok: true; value: Attachment[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) return { ok: false, message: "Attachments weren't readable." };
  if (raw.length > LIMITS.attachments) return { ok: false, message: `Attach at most ${LIMITS.attachments} files.` };
  const out: Attachment[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") return { ok: false, message: "Attachments weren't readable." };
    const { name, text } = a as Record<string, unknown>;
    if (typeof name !== "string" || !name.trim() || typeof text !== "string" || !text.trim()) return { ok: false, message: "Each attachment needs a name and some text." };
    out.push({ name: name.trim().slice(0, 120), text });
  }
  if (totalChars(out) > LIMITS.attachmentChars) return { ok: false, message: `Attachments can hold ${LIMITS.attachmentChars.toLocaleString("en")} characters in total.` };
  return { ok: true, value: out };
}
