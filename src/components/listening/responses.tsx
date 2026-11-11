"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChatCircleText, Check, HandPalm, Robot, SignIn } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CharCount, FieldMsg, TextArea } from "@/components/ui/Form";
import { notifyError, notifySuccess } from "@/lib/toast";
import { holdTheLine, joinFromInterruption, listPositions, sendView } from "@/app/actions/listening";
import type { Interruption, StandingPosition } from "@/lib/api/listening-types";
import { MAX_HOLD, MAX_VIEW, preselectPositions } from "@/lib/listening";
import { Bone, LoadingLabel } from "@/components/ui/Page";

/* The three answers to an interruption, in one place, so the live toast, the Inbox row and the
   Listening page behave alike:

   - Join now: the choice for that meeting becomes Attend (your agent stops listening there) and
     the room opens. Consent is asked when the call token is minted, as for any join.
   - Send a view: a short text, posted into the meeting as "Sushan's view". The host sees it
     first and shares it with the room.
   - Let my agent hold the line: only lines you saved beforehand. They go to the host as the line
     your agent holds, and your agent answers questions in that meeting with them.

   The dialogs live with the caller, never inside a toast (a toast is a transformed box, which
   would trap a fixed dialog inside it). `onAnswered` reports the updated state so a row can show
   the outcome in place. */

export type Answer = "joined" | "view_sent" | "holding_line" | "dismissed";

export function useInterruptionResponses(onAnswered?: (id: string, answer: Answer) => void) {
  const router = useRouter();
  const [viewFor, setViewFor] = useState<Interruption | null>(null);
  const [holdFor, setHoldFor] = useState<Interruption | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const join = useCallback(
    async (i: Interruption) => {
      if (joining) return;
      setJoining(i.id);
      const res = await joinFromInterruption(i.id);
      setJoining(null);
      if (!res.ok) {
        notifyError(res.message);
        return;
      }
      onAnswered?.(i.id, "joined");
      router.push(res.data.join_url || i.join_url);
    },
    [joining, onAnswered, router],
  );

  const dialogs: ReactNode = (
    <>
      <ViewDialog
        interruption={viewFor}
        onClose={() => setViewFor(null)}
        onSent={(id) => {
          setViewFor(null);
          onAnswered?.(id, "view_sent");
        }}
      />
      <HoldLineDialog
        interruption={holdFor}
        onClose={() => setHoldFor(null)}
        onHeld={(id) => {
          setHoldFor(null);
          onAnswered?.(id, "holding_line");
        }}
      />
    </>
  );

  return {
    join,
    joining,
    openView: (i: Interruption) => setViewFor(i),
    openHold: (i: Interruption) => setHoldFor(i),
    dialogs,
  };
}

/** The three buttons, for a row or a card (the toast draws its own). */
export function AnswerButtons({
  interruption,
  onJoin,
  onView,
  onHold,
  joining = false,
  size = "sm",
}: {
  interruption: Interruption;
  onJoin: () => void;
  onView: () => void;
  onHold: () => void;
  joining?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div role="group" aria-label={`Answer: ${interruption.title}`} className="flex flex-wrap items-center gap-2">
      <Button size={size} onClick={onJoin} disabled={joining} aria-busy={joining || undefined}>
        <SignIn size={15} weight="bold" aria-hidden />
        {joining ? "Opening" : "Join now"}
      </Button>
      <Button size={size} variant="outline" onClick={onView}>
        <ChatCircleText size={15} aria-hidden />
        Send a view
      </Button>
      <Button size={size} variant="outline" onClick={onHold}>
        <Robot size={15} aria-hidden />
        Let my agent hold the line
      </Button>
    </div>
  );
}

function ViewDialog({ interruption, onClose, onSent }: { interruption: Interruption | null; onClose: () => void; onSent: (id: string) => void }) {
  const uid = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (interruption) {
      setText("");
      setError(null);
    }
  }, [interruption]);

  if (!interruption) return null;
  const n = text.trim().length;

  const submit = async () => {
    if (!n) return setError("Write your view first.");
    if (n > MAX_VIEW) return setError(`Keep your view under ${MAX_VIEW} characters.`);
    setBusy(true);
    const res = await sendView(interruption.id, text);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    notifySuccess("View sent", { description: `The host of ${interruption.meeting_title} sees it first and shares it with the room.` });
    onSent(interruption.id);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title="Send a view"
      description={
        <>
          It goes into <strong className="font-semibold text-ink-2">{interruption.meeting_title}</strong> as your view. The host sees it first,
          then shares it with the room.
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={`${uid}-text`} className="text-[15px] font-semibold text-ink">
            Your view
          </label>
          <CharCount n={n} max={MAX_VIEW} />
        </div>
        <TextArea
          id={`${uid}-text`}
          rows={4}
          value={text}
          maxLength={MAX_VIEW + 50}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${uid}-msg`}
          placeholder="Keep SMB at 10% off. 15% breaks the margin model; I can walk it through tomorrow."
          className="mt-2"
        />
        <FieldMsg id={`${uid}-msg`} error={error} hint={`About ${interruption.topic ?? "this"}. Short and specific lands best.`} />
        <div className="mt-5 flex flex-wrap justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || n === 0} aria-busy={busy || undefined}>
            {busy ? "Sending" : "Send view"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

type Loaded = { state: "loading" } | { state: "error"; message: string } | { state: "ready"; items: StandingPosition[] };

function HoldLineDialog({ interruption, onClose, onHeld }: { interruption: Interruption | null; onClose: () => void; onHeld: (id: string) => void }) {
  const uid = useId();
  const [loaded, setLoaded] = useState<Loaded>({ state: "loading" });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (i: Interruption) => {
    setLoaded({ state: "loading" });
    const res = await listPositions();
    if (!res.ok) return setLoaded({ state: "error", message: res.message });
    setLoaded({ state: "ready", items: res.data });
    setPicked(preselectPositions(res.data, i.topic, i.headline));
  }, []);

  useEffect(() => {
    if (!interruption) return;
    setError(null);
    void load(interruption);
  }, [interruption, load]);

  if (!interruption) return null;

  const toggle = (id: string) => {
    setError(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_HOLD ? p : [...p, id]));
  };

  const submit = async () => {
    if (picked.length === 0) return setError("Pick at least one of your lines.");
    setBusy(true);
    const res = await holdTheLine(interruption.id, picked);
    setBusy(false);
    if (!res.ok) return setError(res.message);
    notifySuccess("Your agent is holding the line", {
      description: "The host sees your lines first. Your agent answers questions there with them, and nothing else.",
    });
    onHeld(interruption.id);
  };

  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      size="lg"
      title="Let your agent hold the line"
      description={
        <>
          Your agent puts forward only lines you saved beforehand, in <strong className="font-semibold text-ink-2">{interruption.meeting_title}</strong>.
          It says nothing you did not approve.
        </>
      }
    >
      {loaded.state === "loading" ? (
        <div aria-busy className="space-y-2.5">
          <LoadingLabel label="Loading your lines" />
          {[0, 1, 2].map((k) => (
            <Bone key={k} className="h-14" />
          ))}
        </div>
      ) : loaded.state === "error" ? (
        <div className="rounded-ctl bg-bg-2 px-4 py-4">
          <p className="text-[15px] text-ink-2">{loaded.message}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => void load(interruption)}>
            Retry
          </Button>
        </div>
      ) : loaded.items.length === 0 ? (
        <div className="rounded-ctl bg-bg-2 px-4 py-5">
          <p className="text-[15px] font-semibold text-ink">You have not saved any lines yet</p>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
            A line is a position you are happy for your agent to state for you, like &ldquo;No discount above 10% for SMB without finance&rdquo;.
          </p>
          <Link href="/settings/listening#lines" className="mt-3 inline-flex text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline" onClick={onClose}>
            Add your lines in Settings
          </Link>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <fieldset>
            <legend className="text-[15px] font-semibold text-ink">
              Your lines <span className="font-normal text-ink-3">(up to {MAX_HOLD})</span>
            </legend>
            <ul className="mt-2.5 max-h-[46vh] space-y-2 overflow-y-auto pr-1">
              {loaded.items.map((p) => {
                const on = picked.includes(p.id);
                const full = !on && picked.length >= MAX_HOLD;
                return (
                  <li key={p.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-ctl border px-3.5 py-3 transition-colors duration-150 ${
                        on ? "border-signal bg-signal-soft" : "border-line-2 hover:bg-surface-2"
                      } ${full ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--signal)]"
                        checked={on}
                        disabled={full}
                        onChange={() => toggle(p.id)}
                        aria-describedby={`${uid}-msg`}
                      />
                      <span className="min-w-0">
                        {p.topic ? <span className="block text-[12.5px] font-semibold text-ink-3">{p.topic}</span> : null}
                        <span className="block text-[15px] leading-snug text-ink">{p.text}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          <FieldMsg
            id={`${uid}-msg`}
            error={error}
            hint={picked.length ? `${picked.length} of ${MAX_HOLD} picked.` : "Lines that match the topic are picked for you."}
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2.5">
            <Link href="/settings/listening#lines" className="text-[14px] font-semibold text-ink-3 underline-offset-4 hover:text-ink hover:underline" onClick={onClose}>
              Edit your lines
            </Link>
            <div className="flex gap-2.5">
              <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || picked.length === 0} aria-busy={busy || undefined}>
                <HandPalm size={15} aria-hidden />
                {busy ? "Handing over" : "Hold the line"}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}

/** The outcome of an answered interruption, in place of the buttons. */
export function AnswerOutcome({ text }: { text: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ok">
      <Check size={15} weight="bold" aria-hidden />
      {text}
    </p>
  );
}
