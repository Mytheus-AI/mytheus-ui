"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Handshake, PushPin, SpeakerHigh, Trash } from "@phosphor-icons/react";
import { forgetEverything, updateMemory } from "@/app/actions/memory";
import { Toggle } from "@/components/settings/Toggle";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass, cardPadX } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  MAX_TOPIC_LABEL,
  agentName,
  applyUpdate,
  askedLabel,
  calibrationSentence,
  cleanTopicLabel,
  forgotten,
  isEmptyMemory,
  sortTopics,
  topicStrength,
  type MemoryUpdate,
  type PersonMemory,
} from "@/lib/memory";

/* "What your Myte remembers": the person's own memory across meetings, and the controls over it.

   Cards, top to bottom: the learning switch; topics it follows (strength bar, pin, forget, and a
   field to pin a topic of your own); questions you keep asking (forget); muted topics (unmute);
   how sure each Myte must be, in plain words; what you have open (read-only links into
   My work and the meetings); and Forget everything, behind a confirm dialog.

   Every change answers at once and reconciles with the server's reply; a refused change rolls
   back and says so. A removed row hands focus to its list so the keyboard is never dropped. */

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? dateFmt.format(new Date(iso)) : null);

export function MemoryPanel({ initial }: { initial: PersonMemory }) {
  const router = useRouter();
  const [memory, setMemory] = useState(initial);
  const [busy, setBusy] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const topicsList = useRef<HTMLUListElement>(null);
  const questionsList = useRef<HTMLUListElement>(null);
  const mutedList = useRef<HTMLUListElement>(null);
  const learningId = useId();

  useEffect(() => setMemory(initial), [initial]);

  const mark = (key: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  async function change(key: string, update: MemoryUpdate, done: string, focus?: HTMLElement | null, description?: string) {
    const before = memory;
    mark(key, true);
    setMemory(applyUpdate(memory, update));
    focus?.focus();
    const res = await updateMemory(update);
    mark(key, false);
    if (res.ok) {
      setMemory(res.memory);
      notifySuccess(done, description ? { description } : {});
    } else {
      setMemory(before);
      notifyError(res.message);
    }
  }

  const topics = sortTopics(memory.topics);
  const strongest = Math.max(0, ...memory.topics.filter((t) => !t.pinned).map((t) => t.weight));
  const empty = isEmptyMemory(memory);
  const updated = fmt(memory.updated_at);

  return (
    <div className="flex flex-col gap-5">
      {/* Learning */}
      <section aria-labelledby="memory-learning-heading" className={cardClass({ flush: true })}>
        <CardHead
          id="memory-learning-heading"
          as="h3"
          title="Learning"
          description={updated ? `Last changed ${updated}.` : "Nothing learned yet."}
          divided
        />
        <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 ${cardPadX}`}>
          <div className="min-w-0 max-w-[60ch]">
            <p id={learningId} className="text-[15px] font-semibold text-ink">
              Learn from what I keep and dismiss
            </p>
            <p id={`${learningId}-help`} className="mt-0.5 text-[14px] text-ink-3">
              Your Myte notices the topics you care about and the questions you ask, and gets pickier or more generous with what it shows you.
            </p>
          </div>
          <Toggle
            checked={memory.learning_enabled}
            labelledBy={learningId}
            describedBy={`${learningId}-help`}
            disabled={busy.has("learning")}
            onChange={(next) =>
              change("learning", { learning_enabled: next }, next ? "Learning turned on" : "Learning turned off")
            }
          />
        </div>
        {!memory.learning_enabled ? (
          <div className={`pb-4 ${cardPadX}`}>
            <Note tone="warning">
              Learning is off. Your Myte learns nothing new and does not use what is listed below. Turn it back on to use it again; nothing here is lost.
            </Note>
          </div>
        ) : null}
      </section>

      {empty ? (
        <div className={cardClass({})}>
          <EmptyState
            inCard
            art="brain"
            title="Your Myte has not learned anything yet"
            description="As you keep or dismiss notes and suggestions, and ask questions in meetings, what it learns about you shows up here. You can also pin a topic below."
          />
        </div>
      ) : null}

      {/* Topics */}
      <section aria-labelledby="memory-topics-heading" className={cardClass({ flush: true })}>
        <CardHead
          id="memory-topics-heading"
          as="h3"
          title="Topics it follows"
          description="What your Myte listens for on your behalf. Pinned topics never fade; forgotten ones are muted so they are not learned again."
          right={topics.length ? <Chip tone="outline">{topics.length}</Chip> : null}
          divided
        />
        {topics.length === 0 ? (
          <p className={`py-4 text-[14px] text-ink-3 ${cardPadX}`}>No topics yet. Pin one below to have your Myte follow it from your next meeting.</p>
        ) : (
          <ul ref={topicsList} tabIndex={-1} aria-label="Topics your Myte follows" className="divide-y divide-line focus:outline-none">
            {topics.map((t) => {
              const s = topicStrength(t, strongest);
              const key = `topic:${t.label}`;
              return (
                <li key={t.label} className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${cardPadX}`}>
                  <div className="min-w-0 flex-1 basis-[200px]">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium text-ink">
                      <span className="break-words">{t.label}</span>
                      {t.pinned ? (
                        <Chip tone="accent">
                          <PushPin size={12} weight="fill" aria-hidden />
                          Pinned
                        </Chip>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {t.pinned ? "Added by you" : t.mentions === 1 ? "From 1 item you rated" : `From ${t.mentions} items you rated`}
                      {fmt(t.last_seen_at) ? `, last ${fmt(t.last_seen_at)}` : ""}
                    </p>
                  </div>
                  <div className="flex w-[132px] shrink-0 items-center gap-2" title={`${s.label} interest`}>
                    <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3">
                      <span className="block h-full rounded-full bg-signal" style={{ width: `${Math.round(s.share * 100)}%` }} />
                    </span>
                    <span className="w-[52px] text-[13px] text-ink-3">{s.label}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!t.pinned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy.has(key)}
                        aria-label={`Pin ${t.label}`}
                        onClick={() => change(key, { pin_topics: [t.label] }, "Topic pinned", null, `${t.label} stays followed and never fades.`)}
                      >
                        <PushPin size={15} aria-hidden />
                        Pin
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy.has(key)}
                      aria-label={`Forget ${t.label}`}
                      onClick={() =>
                        change(key, { forget_topics: [t.label] }, "Topic forgotten", topicsList.current, `${t.label} is muted, so it is not learned again. Unmute it any time.`)
                      }
                    >
                      Forget
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <PinTopic
          disabled={busy.has("pin-new")}
          onPin={(label) => {
            const clean = cleanTopicLabel(label, memory.topics);
            if (!clean) return "That topic is already pinned.";
            void change("pin-new", { pin_topics: [clean] }, "Topic pinned", null, `${clean} is followed from your next meeting.`);
            return null;
          }}
        />
      </section>

      {/* Questions */}
      <section aria-labelledby="memory-questions-heading" className={cardClass({ flush: true })}>
        <CardHead
          id="memory-questions-heading"
          as="h3"
          title="Questions you keep asking"
          description="Your Myte watches for answers to these in later meetings."
          divided
        />
        {memory.recurring_questions.length === 0 ? (
          <p className={`py-4 text-[14px] text-ink-3 ${cardPadX}`}>No recurring questions. Questions you ask or save more than once appear here.</p>
        ) : (
          <ul ref={questionsList} tabIndex={-1} aria-label="Questions you keep asking" className="divide-y divide-line focus:outline-none">
            {memory.recurring_questions.map((q) => {
              const key = `question:${q.text}`;
              return (
                <li key={q.text} className={`flex flex-wrap items-center gap-x-4 gap-y-2 py-3 ${cardPadX}`}>
                  <div className="min-w-0 flex-1 basis-[240px]">
                    <p className="break-words text-[15px] text-ink">{q.text}</p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {askedLabel(q.count)}
                      {fmt(q.last_at) ? `, last ${fmt(q.last_at)}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy.has(key)}
                    aria-label={`Forget the question: ${q.text}`}
                    onClick={() => change(key, { forget_questions: [q.text] }, "Question forgotten", questionsList.current)}
                  >
                    Forget
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Muted */}
      <section aria-labelledby="memory-muted-heading" className={cardClass({ flush: true })}>
        <CardHead id="memory-muted-heading" as="h3" title="Muted topics" description="Topics you told your Myte to forget. They are not learned again until you unmute them." divided />
        {memory.muted_topics.length === 0 ? (
          <p className={`py-4 text-[14px] text-ink-3 ${cardPadX}`}>Nothing muted.</p>
        ) : (
          <ul ref={mutedList} tabIndex={-1} aria-label="Muted topics" className={`flex flex-wrap gap-2 py-4 focus:outline-none ${cardPadX}`}>
            {memory.muted_topics.map((label) => {
              const key = `muted:${label}`;
              return (
                <li key={label} className="flex items-center gap-1 rounded-full border border-line-2 bg-surface-2 py-1 pl-3 pr-1">
                  <span className="text-[14px] text-ink-2">{label}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="!h-8 !px-2.5"
                    disabled={busy.has(key)}
                    aria-label={`Unmute ${label}`}
                    onClick={() => change(key, { unmute_topics: [label] }, "Topic unmuted", mutedList.current, `Your Myte may learn ${label} again.`)}
                  >
                    <SpeakerHigh size={15} aria-hidden />
                    Unmute
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Calibration */}
      <section aria-labelledby="memory-calibration-heading" className={cardClass({ flush: true })}>
        <CardHead
          id="memory-calibration-heading"
          as="h3"
          title="How sure it needs to be"
          description="Your Myte shows you each kind of thing only when it is at least this confident. Keeping and dismissing what it shows moves the bar."
          divided
        />
        {memory.calibration.length === 0 ? (
          <p className={`py-4 text-[14px] text-ink-3 ${cardPadX}`}>Your Myte uses the workspace setting.</p>
        ) : (
          <ul aria-label="How sure your Myte needs to be" className="divide-y divide-line">
            {memory.calibration.map((c) => (
              <li key={c.agent} className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 py-3 ${cardPadX}`}>
                <div className="min-w-0 flex-1 basis-[260px]">
                  <p className="text-[15px] font-medium text-ink">{agentName(c.agent)}</p>
                  <p className="mt-0.5 text-[14px] text-ink-2">{calibrationSentence(c)}</p>
                </div>
                <Chip tone={c.personal ? "accent" : "outline"}>{c.personal ? "Tuned to you" : "Workspace setting"}</Chip>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Open */}
      <section aria-labelledby="memory-open-heading" className={cardClass({ flush: true })}>
        <CardHead
          id="memory-open-heading"
          as="h3"
          title="What you have open"
          description="Your Myte keeps these in mind in every meeting. Change them in My work."
          divided
        />
        <div className="grid md:grid-cols-2 md:divide-x md:divide-line max-md:divide-y max-md:divide-line">
          <OpenList
            title="Tasks"
            icon={<CheckSquare size={17} aria-hidden />}
            more="/work/tasks"
            moreLabel="All your tasks"
            empty="No open tasks."
            items={memory.open_actions.map((a) => ({
              id: a.id,
              text: a.content,
              meta: a.due_date ? `Due ${fmt(`${a.due_date}T12:00:00Z`) ?? a.due_date}` : null,
              href: a.meeting_id ? `/meetings/${a.meeting_id}` : "/work/tasks",
            }))}
          />
          <OpenList
            title="Promises"
            icon={<Handshake size={17} aria-hidden />}
            more="/work/promises"
            moreLabel="All your promises"
            empty="No open promises."
            items={memory.open_promises.map((p) => ({ id: p.id, text: p.content, meta: p.due_hint, href: `/meetings/${p.meeting_id}` }))}
          />
        </div>
      </section>

      {/* Forget everything */}
      <section aria-labelledby="memory-forget-heading" className={cardClass({ flush: true, tone: "danger" })}>
        <CardHead
          id="memory-forget-heading"
          as="h3"
          tone="danger"
          title="Forget everything"
          description="Clears the topics, questions and muted topics above, and the wording of the feedback your Myte learned from. Your tasks, promises and meetings are not touched."
          right={
            <Button variant="danger-outline" size="sm" onClick={() => setConfirming(true)}>
              <Trash size={16} aria-hidden />
              Forget everything
            </Button>
          }
        />
      </section>

      <ForgetDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onForgotten={() => {
          setMemory(forgotten(memory));
          setConfirming(false);
          notifySuccess("Memory cleared", { description: "Your Myte starts learning from scratch." });
          router.refresh();
        }}
      />
    </div>
  );
}

function PinTopic({ onPin, disabled }: { onPin: (label: string) => string | null; disabled: boolean }) {
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) {
      setError("Type a topic to pin.");
      return;
    }
    const problem = onPin(value);
    setError(problem);
    if (!problem) setValue("");
  }
  return (
    <form onSubmit={submit} noValidate className={`border-t border-line bg-surface-2 py-4 ${cardPadX}`}>
      <label htmlFor={id} className="text-[14px] font-semibold text-ink">
        Pin a topic of your own
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          value={value}
          maxLength={MAX_TOPIC_LABEL}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="For example, Project Falcon"
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-msg`}
          className={`${fieldClass} sm:flex-1`}
        />
        <Button type="submit" variant="outline" disabled={disabled} className="shrink-0">
          <PushPin size={16} aria-hidden />
          Pin topic
        </Button>
      </div>
      <FieldMsg id={`${id}-msg`} error={error} hint="Your Myte follows it in every meeting, and it never fades." />
    </form>
  );
}

function OpenList({
  title,
  icon,
  items,
  empty,
  more,
  moreLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; text: string; meta: string | null; href: string }[];
  empty: string;
  more: string;
  moreLabel: string;
}) {
  return (
    <div className={`min-w-0 py-4 ${cardPadX}`}>
      <h4 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <span className="text-ink-3">{icon}</span>
        {title}
        <span className="font-normal text-ink-3">({items.length})</span>
      </h4>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-ink-3">{empty}</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="-mx-2 block rounded-ctl px-2 py-1.5 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal"
              >
                <span className="line-clamp-2 break-words">{item.text}</span>
                {item.meta ? <span className="block text-[13px] text-ink-3">{item.meta}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={more} className="mt-2 inline-flex min-h-[40px] items-center text-[14px] font-semibold text-ink underline decoration-line-2 underline-offset-4 hover:decoration-ink">
        {moreLabel}
      </Link>
    </div>
  );
}

function ForgetDialog({ open, onClose, onForgotten }: { open: boolean; onClose: () => void; onForgotten: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  async function confirm() {
    setBusy(true);
    setError(null);
    const res = await forgetEverything();
    setBusy(false);
    if (res.ok) onForgotten();
    else setError(res.message);
  }
  return (
    <Dialog
      open={open}
      onClose={() => {
        setError(null);
        onClose();
      }}
      busy={busy}
      tone="danger"
      title="Forget everything?"
      description="Your Myte forgets every topic, question and muted topic, and the wording of the feedback it learned from. This cannot be undone."
      initialFocus={cancel}
    >
      <div className="flex flex-col gap-4">
        {error ? <Note tone="error">{error}</Note> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancel} variant="outline" onClick={onClose} disabled={busy}>
            Keep my memory
          </Button>
          <Button variant="danger" onClick={confirm} disabled={busy}>
            <Trash size={16} aria-hidden />
            {busy ? "Forgetting" : "Forget everything"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
