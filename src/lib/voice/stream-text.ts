/**
 * Talk mode speaks while the answer streams (ADR-0050 D4): this cuts the growing answer text into
 * speakable units as soon as each one is complete, so the speaker can start on the first while the
 * rest is still being written.
 *
 * - The first unit is the first clause (up to the first comma, colon or full stop, about 60
 *   characters at most), so the first sound comes quickly; a word boundary is used when a long
 *   opening has no punctuation yet.
 * - After that, units are sentences (a line break also ends one: list items, headings). Sentences
 *   that complete together are joined up to `max` characters, except the second unit, which stays
 *   short so it renders while the first plays.
 * - Markdown and `[n]` citations are stripped (`speakable`); an unclosed code fence is held back
 *   until it closes (code is never read aloud).
 *
 * Feed it the whole answer text each time it grows (`feed`); `finish` returns what is left once
 * the answer is done. Pure, tested in tests/voice-stream-text.test.ts.
 */

import { speakable } from "./text.ts";

export const FIRST_UNIT_CHARS = 60;
/** a clause shorter than this is not spoken on its own as the first unit ("Yes," joins the next) */
export const FIRST_UNIT_MIN = 14;
export const UNIT_CHARS = 220;
/** the second unit is at most this long, so it is ready before the first clause ends */
export const SECOND_UNIT_CHARS = 140;

export interface Segmenter {
  /** the whole answer so far; returns the units newly complete, in order */
  feed(text: string): string[];
  /** the answer is done: whatever is left, as units */
  finish(): string[];
  /** units handed out so far */
  count(): number;
}

const HAS_WORDS = /[A-Za-z0-9À-￿]/;

/** One raw piece made ready to say. `closed`: it ends a sentence or a line (else a trailing full
    stop that `speakable` added is dropped, so a cut clause does not sound finished). */
export function cleanUnit(raw: string, closed: boolean): string {
  let s = speakable(raw);
  s = s
    .replace(/[*`]+/g, "")
    .replace(/(^|\s)_+|_+(?=\s|$)/g, "$1")
    .replace(/(^|\s)#+\s*/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!closed && /\.$/.test(s) && !/[.!?…]["')\]]*\s*$/.test(raw.trim())) s = s.slice(0, -1).trimEnd();
  return HAS_WORDS.test(s) ? s : "";
}

/** Where the text may be cut, from `from`: up to the next code fence (code is skipped whole,
    and an unclosed fence holds everything after it). */
function limitOf(text: string, from: number): number {
  const i = text.indexOf("```", from);
  return i === -1 ? text.length : i;
}

/** Sentence ends (and line breaks) in text[from, to), as positions just after them; each needs the
    following whitespace to have arrived, so "47.2" or a half-written "e." never ends one. */
function sentenceEnds(text: string, from: number, to: number): number[] {
  const out: number[] = [];
  const re = /([.!?…]["')\]]*(?:\s*\[\d+(?:\s*[,–-]\s*\d+)*\])?)(?=\s)|\n/g;
  re.lastIndex = from;
  for (let m = re.exec(text); m && m.index < to; m = re.exec(text)) {
    const end = m[0] === "\n" ? m.index + 1 : m.index + m[0].length;
    if (end <= to && end < text.length + (m[0] === "\n" ? 1 : 0)) out.push(end);
  }
  return out;
}

/** The first clause end in text[from, to) at least `min` raw characters in (comma, semicolon,
    colon, dash, or a sentence end), followed by whitespace. */
function clauseEnd(text: string, from: number, to: number, min: number): number {
  const re = /([,;:.!?…]["')\]]*(?:\s*\[\d+(?:\s*[,–-]\s*\d+)*\])?)(?=\s)|\s[-–]\s|\n/g;
  re.lastIndex = from;
  for (let m = re.exec(text); m && m.index < to; m = re.exec(text)) {
    const end = m[0] === "\n" ? m.index + 1 : /^\s[-–]\s$/.test(m[0]) ? m.index : m.index + m[0].length;
    const sentence = /[.!?…]/.test(m[0]) || m[0] === "\n";
    if (end > to) break;
    if (sentence || end - from >= min) return end;
  }
  return -1;
}

/** The last word boundary at or before `from + limit` (and after `from`), or -1. */
function wordCut(text: string, from: number, limit: number, to: number): number {
  const window = text.slice(from, Math.min(to, from + limit + 1));
  const at = window.lastIndexOf(" ");
  return at > 0 ? from + at : -1;
}

export function createSegmenter(opts: { first?: number; max?: number; second?: number; firstMin?: number } = {}): Segmenter {
  const first = opts.first ?? FIRST_UNIT_CHARS;
  const max = opts.max ?? UNIT_CHARS;
  const second = opts.second ?? SECOND_UNIT_CHARS;
  const firstMin = opts.firstMin ?? FIRST_UNIT_MIN;
  let text = "";
  let cut = 0;
  let units = 0;

  const emit = (out: string[], raw: string, closed: boolean) => {
    const u = cleanUnit(raw, closed);
    if (u) {
      out.push(u);
      units++;
    }
  };

  /** Take what is complete; `final` also takes the rest. */
  const take = (final: boolean): string[] => {
    const out: string[] = [];
    for (;;) {
      // skip leading whitespace, and a whole code block once it has closed
      while (cut < text.length && /\s/.test(text[cut]!)) cut++;
      if (text.startsWith("```", cut)) {
        const close = text.indexOf("```", cut + 3);
        if (close === -1) {
          if (!final) break;
          cut = text.length;
          break;
        }
        cut = close + 3;
        continue;
      }
      const to = limitOf(text, cut);
      if (cut >= to) break;
      const fenced = to < text.length;

      if (units === 0) {
        let end = clauseEnd(text, cut, to, firstMin);
        if (end !== -1 && end - cut > first + 20) end = -1; // too long a clause: cut on a word instead
        let closed = true;
        if (end === -1 && to - cut > first) {
          end = wordCut(text, cut, first, to);
          closed = false;
        }
        if (end === -1) {
          if (!final && !fenced) break;
          end = to;
        }
        const raw = text.slice(cut, end);
        closed = closed && /[.!?…\n]["')\]]*(?:\s*\[[\d,\s–-]+\])?\s*$/.test(raw);
        cut = end;
        emit(out, raw, closed);
        // A clause that said nothing (only a citation) does not count as the first unit.
        continue;
      }

      const limit = units === 1 ? second : max;
      const ends = sentenceEnds(text, cut, to);
      if (!ends.length) {
        if (final || fenced) {
          // the rest, cut to the limit on words
          let end = to;
          if (end - cut > max) end = wordCut(text, cut, max, to) > cut ? wordCut(text, cut, max, to) : to;
          const raw = text.slice(cut, end);
          cut = end;
          emit(out, raw, true);
          continue;
        }
        // One very long sentence with no end yet: say a clause of it.
        if (to - cut > limit) {
          let end = clauseEnd(text, cut, Math.min(to, cut + limit), Math.floor(limit * 0.4));
          if (end === -1) end = wordCut(text, cut, limit, to);
          if (end === -1) break;
          const raw = text.slice(cut, end);
          cut = end;
          emit(out, raw, false);
          continue;
        }
        break;
      }
      // Sentences complete now: join them up to the limit (the first always goes).
      let end = ends[0]!;
      if (end - cut > limit) {
        let c = clauseEnd(text, cut, Math.min(end, cut + limit), Math.floor(limit * 0.4));
        if (c === -1 || c >= end) c = wordCut(text, cut, limit, end);
        if (c !== -1 && c < end) {
          const raw = text.slice(cut, c);
          cut = c;
          emit(out, raw, false);
          continue;
        }
      }
      if (units > 1) for (const e of ends.slice(1)) if (e - cut <= limit) end = e;
      const raw = text.slice(cut, end);
      cut = end;
      emit(out, raw, true);
    }
    return out;
  };

  return {
    feed(next) {
      if (!next.startsWith(text)) {
        // A different text (a new answer): start over.
        text = "";
        cut = 0;
        units = 0;
      }
      text = next;
      return take(false);
    },
    finish() {
      return take(true);
    },
    count: () => units,
  };
}
