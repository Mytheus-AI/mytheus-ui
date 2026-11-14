/**
 * What a Myte says, made ready for its voice (ADR-0050 D4): markdown and citation markers out,
 * then cut into sentences and short chunks so the first sound comes quickly.
 *
 * The first chunk is short (a sentence, or the first clause of a long one): the voice server
 * renders it in well under a second, and the rest is fetched while it plays. Later chunks join
 * sentences up to about 300 characters, which keeps the voice's phrasing natural and the number
 * of requests low (core-api allows 30 a minute per person). No chunk ever exceeds the route's
 * 1500 character limit.
 *
 * Pure, tested in tests/voice-text.test.ts.
 */

export const MAX_SPEECH_CHARS = 1500;
export const FIRST_CHUNK_CHARS = 140;
export const CHUNK_CHARS = 300;

const ENDS_SENTENCE = /[.!?:;…]["')\]]*$/;

function closeLine(line: string): string {
  const t = line.trim();
  if (!t) return "";
  return ENDS_SENTENCE.test(t) || /[,]$/.test(t) ? t : `${t}.`;
}

/** Markdown and `[n]` citations out; plain sentences in. Code blocks are not read aloud. */
export function speakable(text: string): string {
  if (!text) return "";
  let s = text.replace(/\r\n?/g, "\n");
  s = s.replace(/```[\s\S]*?(?:```|$)/g, "\n"); // fenced code
  s = s.replace(/<[^>\n]+>/g, ""); // stray html
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, ""); // images
  s = s.replace(/\[([^\]]+)\]\((?:[^()]|\([^)]*\))*\)/g, "$1"); // links: keep the words
  s = s.replace(/\s?\[\s*\d+(?:\s*[,–-]\s*\d+)*\s*\]/g, ""); // citations [1], [1, 2], [3-4]
  s = s.replace(/\bhttps?:\/\/\S+/g, "");
  s = s.replace(/`([^`]*)`/g, "$1");
  s = s.replace(/~~(.+?)~~/g, "$1");
  s = s.replace(/(\*\*|__)(.+?)\1/g, "$2");
  s = s.replace(/(^|[\s(])[*_](\S(?:[^\n]*?\S)?)[*_](?=[\s).,;:!?]|$)/gm, "$1$2");

  const out: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push(closeLine(para.join(" ")));
    para = [];
  };
  for (const raw of s.split("\n")) {
    let line = raw.trim();
    if (!line || /^([-*_])(\s*\1){2,}$/.test(line) || /^\|?[\s:|-]+\|[\s:|-]*$/.test(line)) {
      flush();
      continue;
    }
    const heading = /^#{1,6}\s+/.test(line);
    const item = /^([-*+•]|\d+[.)])\s+/.test(line);
    const quote = /^>\s?/.test(line);
    line = line.replace(/^#{1,6}\s+/, "").replace(/^([-*+•]|\d+[.)])\s+/, "").replace(/^>\s?/, "");
    if (line.includes("|")) {
      line = line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean)
        .join(", ");
    }
    if (heading || item) {
      flush();
      out.push(closeLine(line));
    } else if (quote) {
      para.push(line);
    } else {
      para.push(line);
    }
  }
  flush();
  return out
    .filter(Boolean)
    .join(" ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([.!?])\.(?=\s|$)/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Sentences, split only where punctuation meets a space (so 47.2% and e.g. stay whole). */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…]["')\]]?)\s+(?=\S)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Cut one over-long piece at the last clause break (then the last space) before `limit`. */
function cut(piece: string, limit: number): [string, string] {
  if (piece.length <= limit) return [piece, ""];
  const window = piece.slice(0, limit + 1);
  const clause = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "), window.lastIndexOf(" - "));
  const at = clause > limit * 0.4 ? clause + 1 : window.lastIndexOf(" ");
  if (at <= 0) return [piece.slice(0, limit), piece.slice(limit).trim()];
  return [piece.slice(0, at).trim(), piece.slice(at).trim()];
}

/** The chunks a text is spoken in, in order. Empty when there is nothing to say. */
export function speechChunks(text: string, opts: { first?: number; max?: number } = {}): string[] {
  const max = Math.min(opts.max ?? CHUNK_CHARS, MAX_SPEECH_CHARS);
  const first = Math.min(opts.first ?? FIRST_CHUNK_CHARS, max);
  const queue = sentences(speakable(text));
  const chunks: string[] = [];
  let current = "";
  const limit = () => (chunks.length === 0 ? first : max);
  while (queue.length) {
    const next = queue.shift()!;
    if (!current) {
      if (next.length <= limit()) {
        // The first chunk is one sentence on its own, for the quickest first sound.
        if (chunks.length === 0) chunks.push(next);
        else current = next;
      } else {
        const [head, rest] = cut(next, limit());
        chunks.push(head);
        if (rest) queue.unshift(rest);
      }
      continue;
    }
    if (current.length + 1 + next.length <= limit()) current = `${current} ${next}`;
    else {
      chunks.push(current);
      current = "";
      queue.unshift(next);
    }
  }
  if (current) chunks.push(current);
  // A piece with nothing to say (a lone full stop) is never sent.
  return chunks.filter((c) => /[A-Za-z0-9\u00C0-\uFFFF]/.test(c));
}
