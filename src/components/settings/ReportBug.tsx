"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bug, ChatCircleText } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CharCount, TextInput, textareaClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifySuccess } from "@/lib/toast";
import { submitFeedback } from "@/app/actions/feedback";
import { FEEDBACK_MAX, type FeedbackKind } from "@/lib/ops";

/* The "Report a bug" button and its dialog (ADR-0046 D6). What is written goes straight to the
   Mytheus team's feedback inbox, with the sender's email so they can answer. */

const KINDS: { value: FeedbackKind; label: string; help: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Something is broken", help: "A bug, an error, or something that does not work the way it should.", icon: Bug },
  { value: "feedback", label: "Feedback or an idea", help: "What you like, what you would change, or what is missing.", icon: ChatCircleText },
];

export function ReportBug({ initialKind = "bug" }: { initialKind?: FeedbackKind }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const uid = useId();

  const send = () =>
    start(async () => {
      setError(null);
      const res = await submitFeedback(kind, message, page);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setOpen(false);
      setMessage("");
      setPage("");
      notifySuccess(kind === "bug" ? "Bug report sent" : "Feedback sent", { description: "The Mytheus team will see it in their inbox." });
      router.refresh();
    });

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        <Button
          onClick={() => {
            setKind("bug");
            setOpen(true);
          }}
        >
          <Bug size={17} aria-hidden /> Report a bug
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setKind("feedback");
            setOpen(true);
          }}
        >
          <ChatCircleText size={17} aria-hidden /> Send feedback
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        busy={pending}
        title={kind === "bug" ? "Report a bug" : "Send feedback"}
        description="This goes to the Mytheus team, with your email so we can reply. Leave out passwords and anything private."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-[14px] font-semibold text-ink">What is it?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {KINDS.map((k) => {
                const on = kind === k.value;
                return (
                  <label
                    key={k.value}
                    className={`flex cursor-pointer flex-col gap-1 rounded-ctl border px-3.5 py-3 transition-colors ${
                      on ? "border-ink bg-surface-2" : "border-line hover:bg-surface-2"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                      <input type="radio" name={`${uid}-kind`} value={k.value} checked={on} onChange={() => setKind(k.value)} className="accent-[var(--signal)]" />
                      <k.icon size={16} aria-hidden /> {k.label}
                    </span>
                    <span className="text-[13px] leading-snug text-ink-3">{k.help}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-message`} className="text-[14px] font-semibold text-ink">
              {kind === "bug" ? "What happened?" : "What would you like to tell us?"}
            </label>
            <textarea
              id={`${uid}-message`}
              required
              rows={5}
              maxLength={FEEDBACK_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={textareaClass}
              placeholder={kind === "bug" ? "What you did, what you expected, and what happened instead." : "Anything at all."}
            />
            <CharCount n={message.length} max={FEEDBACK_MAX} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-page`} className="text-[14px] font-semibold text-ink">
              Where in Mytheus? <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <TextInput
              id={`${uid}-page`}
              maxLength={300}
              value={page}
              onChange={(e) => setPage(e.target.value)}
              placeholder="For example: the meeting room, or the Tasks page"
            />
          </div>

          {error ? <Note tone="error">{error}</Note> : null}

          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" disabled={pending || !message.trim()} aria-busy={pending}>
              {pending ? "Sending" : "Send to the Mytheus team"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
