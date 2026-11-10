"use client";

import { useId, type FormEvent } from "react";
import { PaperPlaneRight, VideoCamera, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/Form";
import { PERSONAL_LIMITS, composeStatusText, type StatusRequestView } from "@/lib/api/personal-types";
import { LocalWhen } from "./LocalWhen";
import { QuickPick } from "./QuickPick";
import type { Draft } from "./useStatusAnswers";

/* One pending request answered in a single line: the action and its meeting on the left, then the
   quick pick, an optional line of text and Send. On a wide page (`wide`) it is one row from xl up;
   in a card it stacks the answer under the action. Enter in the text sends. */
export function StatusAnswerRow({
  req,
  draft,
  error,
  saving,
  nowIso,
  wide = false,
  onDraft,
  onSubmit,
  as: Tag = "li",
  className = "px-4 py-4 sm:px-[22px]",
}: {
  /** a div when the caller supplies its own list item (the Inbox) */
  as?: "li" | "div";
  className?: string;
  req: StatusRequestView;
  draft: Draft;
  error?: string;
  saving: boolean;
  nowIso: string;
  wide?: boolean;
  onDraft: (next: Partial<Draft>) => void;
  onSubmit: () => void;
}) {
  const uid = useId();
  const noteId = `${uid}-note`;
  const errId = `${uid}-err`;
  const titleId = `${uid}-title`;
  const text = composeStatusText(draft.pick, draft.note);
  const maxNote = PERSONAL_LIMITS.statusText - (draft.pick ? 10 : 0);

  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!saving) onSubmit();
  };

  return (
    <Tag aria-busy={saving || undefined} className={className}>
      <div className={`grid gap-3 ${wide ? "xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-6" : ""}`}>
        <div className="min-w-0">
          <p id={titleId} className="text-[15px] font-semibold leading-snug text-ink">
            {req.actionTitle}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <VideoCamera size={14} aria-hidden className="shrink-0" />
            <span className="min-w-0 truncate">
              For {req.meetingTitle}
              {req.meetingStart ? (
                <>
                  , <LocalWhen iso={req.meetingStart} nowIso={nowIso} mode="upcoming" />
                </>
              ) : null}
            </span>
          </p>
        </div>

        <form onSubmit={send} aria-labelledby={titleId} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <QuickPick
            label="How is it going?"
            value={draft.pick}
            disabled={saving}
            onChange={(pick) => onDraft({ pick })}
          />
          <label htmlFor={noteId} className="sr-only">
            Add a line, optional
          </label>
          <input
            id={noteId}
            value={draft.note}
            maxLength={maxNote}
            disabled={saving}
            onChange={(e) => onDraft({ note: e.target.value })}
            placeholder="Add a line, optional"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
            className={`${fieldClass} !w-auto min-w-0 flex-1 basis-[200px] ${wide ? "xl:!w-[280px] xl:flex-none" : ""}`}
          />
          <Button type="submit" size="md" disabled={saving || !text} aria-busy={saving} className="shrink-0">
            <PaperPlaneRight size={15} weight="bold" aria-hidden />
            {saving ? "Sending" : "Send"}
          </Button>
        </form>
      </div>
      {error ? (
        <p id={errId} role="alert" className="mt-2 flex items-center gap-1.5 text-[14px] text-priority-high">
          <WarningCircle size={15} weight="fill" aria-hidden className="shrink-0" />
          {error}
        </p>
      ) : null}
    </Tag>
  );
}
