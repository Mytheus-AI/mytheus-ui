"use client";

import { useMemo } from "react";
import { relativeDay, type PromiseView } from "@/lib/api/personal-types";
import { PanelEmpty } from "./parts";
import { PromiseCheck } from "./PromiseCheck";
import { UndoBar } from "./UndoBar";
import { usePromises } from "./usePromises";

/* The card's rows. A promise marked done stays in place, struck through, until the next visit,
   so nothing jumps under the pointer; Undo (in the bar, or by unticking) moves it back. */
export function PromisesCardList({ initial, nowIso }: { initial: PromiseView[]; nowIso: string }) {
  const { items, pending, notice, change, closeNotice } = usePromises(initial);
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const rows = items.filter((p) => p.status !== "dismissed");

  if (rows.length === 0) {
    return (
      <PanelEmpty
        title="Nothing promised"
        text="When you say you will do something in a meeting, your agent writes it down here, privately."
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-line border-t border-line">
        {rows.map((p) => {
          const done = p.status === "done";
          return (
            <li
              key={p.id}
              aria-busy={pending[p.id] ? true : undefined}
              className="flex min-h-[56px] items-start gap-3 px-[18px] py-3 sm:px-[22px]"
            >
              <PromiseCheck
                content={p.content}
                done={done}
                busy={!!pending[p.id]}
                onToggle={() => change(p.id, done ? "open" : "done")}
              />
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={`text-[14px] font-medium leading-snug ${
                    done ? "text-ink-3 line-through decoration-ink-4" : "text-ink"
                  }`}
                >
                  {p.content}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                  {p.due_hint ? `${p.due_hint}, ` : ""}said {relativeDay(p.created_at, now)} in {p.meetingTitle}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <UndoBar notice={notice} onClose={closeNotice} />
    </>
  );
}
