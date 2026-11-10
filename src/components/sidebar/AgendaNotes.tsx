"use client";

import { useState } from "react";
import { CaretDown, HandHeart, Lock, NotePencil } from "@phosphor-icons/react";
import type { NoteGroup } from "@/lib/realtime/calm";
import { notePromises } from "@/lib/realtime/moments";
import type { LiveNote } from "@/lib/realtime/notes";
import { MomentLine, type MomentTarget } from "@/components/sidebar/MomentLine";

/* Your notes, folded under the agenda item they were said in (polish program, Phase 1: "notes
   folded under the current agenda item"). The item in progress is open; earlier items fold to one
   line with their count, and each opens on its own. Notes outside the agenda sit in "Other notes".
   A note that is part of a card waiting above says so instead of repeating itself, and a promise
   you made shows under its note. Private: only you see your notes. */

const STATUS_LABEL: Record<string, string> = {
  in_progress: "Now",
  covered: "Covered",
  skipped: "Skipped",
  not_started: "Not started",
};

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
}

function Note({
  n,
  meId,
  onCard,
  onOpenMoment,
}: {
  n: LiveNote;
  meId: string | null;
  onCard: boolean;
  onOpenMoment?: (target: MomentTarget, opener: HTMLElement) => void;
}) {
  const promises = n.final ? notePromises(n) : [];
  return (
    <li className={`mynote${n.final ? " is-final" : " is-new is-draft"}`} aria-busy={n.final ? undefined : true}>
      <NotePencil size={16} aria-hidden />
      <span className="mynote-body">
        {lines(n.text).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {n.final ? null : (
          <p className="mynote-writing">
            Writing<span className="stream-caret" aria-hidden="true"></span>
          </p>
        )}
        {promises.map((p) => (
          <span key={p.key} className="mynote-promise">
            <HandHeart size={13} weight="bold" aria-hidden />
            Your promise: {p.content}
            {p.dueHint ? `, by ${p.dueHint}` : ""}
          </span>
        ))}
        {onCard ? <span className="mynote-oncard">Also on a card in Needs you</span> : null}
        {n.final && n.moment?.quote && !onCard ? <MomentLine moment={n.moment} meId={meId} onOpen={onOpenMoment} /> : null}
      </span>
    </li>
  );
}

export function AgendaNotes({
  groups,
  meId,
  onCard,
  onOpenMoment,
}: {
  groups: NoteGroup[];
  meId: string | null;
  /** Moment ids that already have a card in Needs you. */
  onCard: ReadonlySet<string>;
  onOpenMoment?: (target: MomentTarget, opener: HTMLElement) => void;
}) {
  // Open by default: the item in progress (or the only list). Your clicks override.
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const total = groups.reduce((n, g) => n + g.notes.length, 0);
  if (groups.length === 0) return null;
  const flat = groups.length === 1 && groups[0].key === "other";

  return (
    <section className="agnotes" aria-labelledby="agnotes-h">
      <div className="side-sec">
        <h3 id="agnotes-h">My notes</h3>
        <span className="mx-count">{total}</span>
        <span className="side-sec-end">
          <span className="mx-chip">
            <Lock size={13} weight="fill" aria-hidden />
            Only you
          </span>
        </span>
      </div>
      {flat ? (
        <ol className="mynotes" aria-live="polite" aria-labelledby="agnotes-h">
          {groups[0].notes.map((n) => (
            <Note key={n.windowId} n={n} meId={meId} onCard={Boolean(n.moment?.momentId && onCard.has(n.moment.momentId))} onOpenMoment={onOpenMoment} />
          ))}
        </ol>
      ) : (
        <div className="agnotes-groups">
          {groups.map((g) => {
            const isOpen = open[g.key] ?? g.current;
            const panel = `agnotes-${g.key}`;
            return (
              <div key={g.key} className={`agnotes-group${g.current ? " is-current" : ""}`}>
                <h4 className="agnotes-h">
                  <button
                    type="button"
                    className="agnotes-toggle tap"
                    aria-expanded={isOpen}
                    aria-controls={panel}
                    onClick={() => setOpen((o) => ({ ...o, [g.key]: !isOpen }))}
                  >
                    <CaretDown size={14} weight="bold" className="agnotes-caret" aria-hidden />
                    <span className="agnotes-title">{g.title}</span>
                    {g.status && STATUS_LABEL[g.status] ? (
                      <span className={`agnotes-status${g.current ? " is-now" : ""}`}>{STATUS_LABEL[g.status]}</span>
                    ) : null}
                    <span className="mx-count">
                      {g.notes.length}
                      <span className="sr-only"> {g.notes.length === 1 ? "note" : "notes"}</span>
                    </span>
                  </button>
                </h4>
                <div id={panel} hidden={!isOpen}>
                  {g.notes.length === 0 ? (
                    <p className="agnotes-empty">Notes for this item land here as it is discussed.</p>
                  ) : (
                    <ol className="mynotes" aria-live={g.current ? "polite" : undefined} aria-label={`Notes on ${g.title}`}>
                      {g.notes.map((n) => (
                        <Note
                          key={n.windowId}
                          n={n}
                          meId={meId}
                          onCard={Boolean(n.moment?.momentId && onCard.has(n.moment.momentId))}
                          onOpenMoment={onOpenMoment}
                        />
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
