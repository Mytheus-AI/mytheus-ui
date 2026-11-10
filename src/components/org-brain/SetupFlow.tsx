"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "@phosphor-icons/react";
import { Wordmark } from "@/components/site/Wordmark";
import { Button, LinkButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ChipInput } from "@/components/settings/ChipInput";
import { CharCount as Count, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { MemberPicker } from "@/components/ui/MemberPicker";
import { cardClass } from "@/components/ui/Card";
import { Toaster } from "@/components/ui/Toaster";
import { notifyError, notifySuccess } from "@/lib/toast";
import { OnboardingAside } from "@/components/onboarding/fields";
import { createGoal, createOwner, importTerms, loadReadiness, saveOrgProfile } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  GLOSSARY_KINDS,
  KIND_LABEL,
  deriveReadiness,
  parseGlossaryImport,
  validateGoal,
  validateOrgProfile,
  validateOwner,
  validateTerm,
  type FieldErrors,
  type GlossaryKind,
  type GlossaryTerm,
  type OrgGoal,
  type OrgProfile,
  type ProfileField,
  type Readiness,
  type TopicOwner,
} from "@/lib/api/org-brain-types";
import { ReadinessMeter } from "./ReadinessMeter";
import type { MemberOption } from "./types";

/* The first-run setup of the company brain (ADR-0039 Part E), for the admin who just created a
   workspace: About, a few words, who owns what, one goal, then the readiness meter. Every step
   can be skipped; nothing is required. The steps run down a coral line on the left (a bead fills
   as each is saved), the step in the middle, and on wide screens what the agents know so far on
   the right, so the admin sees each answer land. */

type StepKey = "about" | "words" | "owners" | "goal" | "done";
const STEPS: { key: StepKey; label: string; hint: string }[] = [
  { key: "about", label: "About the company", hint: "What you do, for whom" },
  { key: "words", label: "Your words", hint: "Names outsiders would not know" },
  { key: "owners", label: "Who owns what", hint: "Who to ask about what" },
  { key: "goal", label: "One goal", hint: "What matters this quarter" },
  { key: "done", label: "Ready", hint: "How ready your agents are" },
];
type Outcome = "saved" | "skipped";

const KIND_OPTIONS = GLOSSARY_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
const OWNER_TOPICS = ["Pricing", "Hiring", "Customer support", "Security", "Releases", "Billing"];

/* ---------------- the rail ---------------- */

function Rail({ step, outcomes, onGo }: { step: number; outcomes: Partial<Record<StepKey, Outcome>>; onGo: (i: number) => void }) {
  return (
    <nav aria-label="Setup steps">
      <ol className="relative">
        {/* the line the beads sit on */}
        <span aria-hidden className="absolute bottom-6 left-[11px] top-6 w-[2px] rounded-full bg-line-2" />
        <span
          aria-hidden
          className="absolute left-[11px] top-6 w-[2px] rounded-full bg-[var(--signal-line)] transition-[height] duration-300 ease-[var(--ease-out)] motion-reduce:transition-none"
          style={{ height: `calc((100% - 48px) * ${step / (STEPS.length - 1)})` }}
        />
        {STEPS.map((s, i) => {
          const o = outcomes[s.key];
          const current = i === step;
          const reachable = i <= step || !!o || i === step + 1;
          return (
            <li key={s.key} className="relative">
              <button
                type="button"
                onClick={() => onGo(i)}
                disabled={!reachable || s.key === "done"}
                aria-current={current ? "step" : undefined}
                className="group flex w-full items-start gap-3.5 rounded-ctl py-3 pr-2 text-left disabled:cursor-default"
              >
                <span
                  aria-hidden
                  className={`relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors duration-200 ${
                    o === "saved"
                      ? "bg-signal text-pill-on shadow-[0_0_0_4px_var(--signal-soft)]"
                      : current
                        ? "border-2 border-signal bg-surface"
                        : "border-2 border-line-2 bg-bg"
                  }`}
                >
                  {o === "saved" ? <Check size={12} weight="bold" /> : null}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[15px] font-semibold ${current ? "text-ink" : "text-ink-2"}`}>{s.label}</span>
                  <span className="block text-[12.5px] text-ink-3">
                    {o === "skipped" ? "Skipped for now" : o === "saved" ? "Saved" : s.hint}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ---------------- what the agents know so far ---------------- */

function Known({
  profile,
  terms,
  owners,
  goals,
  members,
}: {
  profile: OrgProfile;
  terms: GlossaryTerm[];
  owners: TopicOwner[];
  goals: OrgGoal[];
  members: MemberOption[];
}) {
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? "someone";
  const active = goals.filter((g) => g.status === "active");
  const empty = !profile.description.trim() && !terms.length && !owners.length && !active.length;
  return (
    <aside aria-labelledby="known-h" className={cardClass()}>
      <h2 id="known-h" className="text-[14px] font-semibold text-ink-3">
        What your agents know so far
      </h2>
      {empty ? (
        <p className="mt-3 font-display text-[17px] italic leading-snug text-ink-3">
          Only your people and your meetings. Each answer you save shows up here.
        </p>
      ) : (
        <div className="mt-3 space-y-4 text-[14px] leading-relaxed text-ink-2">
          {profile.description.trim() ? <p className="line-clamp-5 text-ink">{profile.description.trim()}</p> : null}
          {terms.length ? (
            <div>
              <p className="text-[12.5px] font-semibold text-ink-3">{terms.length} words</p>
              <p className="mt-1">{terms.slice(0, 8).map((t) => t.term).join(", ")}{terms.length > 8 ? ", and more" : ""}</p>
            </div>
          ) : null}
          {owners.length ? (
            <div>
              <p className="text-[12.5px] font-semibold text-ink-3">Who owns what</p>
              <ul className="mt-1 space-y-0.5">
                {owners.slice(0, 5).map((o) => (
                  <li key={o.id}>
                    <span className="font-semibold text-ink">{o.topic}</span>: {name(o.owner_user_id)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {active.length ? (
            <div>
              <p className="text-[12.5px] font-semibold text-ink-3">Goals</p>
              <ul className="mt-1 space-y-0.5">
                {active.slice(0, 3).map((g) => (
                  <li key={g.id}>{g.title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  );
}

/* ---------------- the step frame ---------------- */

function StepFrame({
  index,
  title,
  lead,
  children,
  busy,
  primary,
  onSkip,
  onBack,
}: {
  index: number;
  title: string;
  lead: string;
  children: ReactNode;
  busy: boolean;
  primary: string;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <div className="flex flex-col">
      <p className="text-[14px] font-semibold text-signal-ink">
        Step {index + 1} of {STEPS.length - 1}
      </p>
      <h1 ref={heading} tabIndex={-1} className="display mt-1.5 text-[clamp(28px,3vw,34px)] text-ink">
        {title}
      </h1>
      <p className="mt-2 max-w-[60ch] text-pretty text-[15px] leading-relaxed text-ink-3">{lead}</p>
      <div className="mt-6">{children}</div>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={busy} aria-busy={busy || undefined}>
          {busy ? "Saving" : primary}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={busy}
          className="min-h-[40px] rounded-[4px] text-[15px] font-semibold text-ink-2 underline decoration-signal-line decoration-2 underline-offset-[5px] hover:text-ink hover:decoration-signal disabled:opacity-50"
        >
          Skip this step
        </button>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={busy}
            className="min-h-[40px] rounded-[4px] text-[15px] font-medium text-ink-3 hover:text-ink disabled:opacity-50 sm:ml-auto"
          >
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- the flow ---------------- */

type TermRow = { key: number; term: string; definition: string; kind: GlossaryKind };
type OwnerRow = { key: number; topic: string; owner: string | null };
let seq = 0;
const termRow = (term = "", kind: GlossaryKind = "other", definition = ""): TermRow => ({ key: ++seq, term, definition, kind });
const ownerRow = (topic = ""): OwnerRow => ({ key: ++seq, topic, owner: null });

export function SetupFlow({
  orgName,
  email,
  initialProfile,
  initialTerms,
  initialOwners,
  initialGoals,
  members,
  defaultPeriod,
}: {
  orgName: string;
  email: string;
  initialProfile: OrgProfile;
  initialTerms: GlossaryTerm[];
  initialOwners: TopicOwner[];
  initialGoals: OrgGoal[];
  members: MemberOption[];
  defaultPeriod: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [outcomes, setOutcomes] = useState<Partial<Record<StepKey, Outcome>>>({});
  const [busy, setBusy] = useState(false);

  // what is saved
  const [profile, setProfile] = useState(initialProfile);
  const [terms, setTerms] = useState(initialTerms);
  const [owners, setOwners] = useState(initialOwners);
  const [goals, setGoals] = useState(initialGoals);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  // step 1
  const [description, setDescription] = useState(initialProfile.description);
  const [industry, setIndustry] = useState(initialProfile.industry);
  const [products, setProducts] = useState(initialProfile.products);
  const [customers, setCustomers] = useState(initialProfile.customers);
  const [aboutErrors, setAboutErrors] = useState<FieldErrors<ProfileField>>({});
  // step 2
  const [termRows, setTermRows] = useState<TermRow[]>(() => [termRow(), termRow(), termRow()]);
  const [termError, setTermError] = useState<string | null>(null);
  // step 3
  const [ownerRows, setOwnerRows] = useState<OwnerRow[]>(() => [ownerRow(), ownerRow(), ownerRow()]);
  const [ownerError, setOwnerError] = useState<string | null>(null);
  // step 4
  const [goalTitle, setGoalTitle] = useState("");
  const [goalPeriod, setGoalPeriod] = useState(defaultPeriod);
  const [goalOwner, setGoalOwner] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  const key = STEPS[step].key;

  const advance = (outcome: Outcome) => {
    setOutcomes((o) => ({ ...o, [key]: o[key] === "saved" && outcome === "skipped" ? "saved" : outcome }));
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // the readiness at the end: the server's, or worked out from what was saved here
  useEffect(() => {
    if (key !== "done") return;
    let live = true;
    void loadReadiness().then((r) => {
      if (live) setReadiness(r);
    });
    return () => {
      live = false;
    };
  }, [key]);
  const derived = useMemo(
    () =>
      deriveReadiness({
        descriptionLength: profile.description.trim().length,
        terms: terms.length,
        owners: owners.length,
        activeGoals: goals.filter((g) => g.status === "active").length,
        groundRulesSet: false,
        membersWithoutRole: null,
      }),
    [profile, terms, owners, goals],
  );

  /* suggestions for step 2: products and customers from step 1 not yet words */
  const termSuggestions = useMemo(() => {
    const have = new Set([...terms.map((t) => t.term.toLowerCase()), ...termRows.map((r) => r.term.trim().toLowerCase())]);
    return [
      ...profile.products.map((p) => ({ term: p, kind: "product" as GlossaryKind })),
      ...profile.customers.map((c) => ({ term: c, kind: "customer" as GlossaryKind })),
    ].filter((s) => !have.has(s.term.toLowerCase()));
  }, [profile, terms, termRows]);

  const ownerSuggestions = useMemo(() => {
    const have = new Set([...owners.map((o) => o.topic.toLowerCase()), ...ownerRows.map((r) => r.topic.trim().toLowerCase())]);
    return [...profile.products, ...OWNER_TOPICS].filter((t, i, a) => !have.has(t.toLowerCase()) && a.indexOf(t) === i).slice(0, 8);
  }, [profile, owners, ownerRows]);

  /* ---- step submits ---- */

  const saveAbout = async () => {
    const checked = validateOrgProfile({ description, industry, products, customers });
    if (!checked.ok) {
      setAboutErrors(checked.errors);
      return;
    }
    const unchanged =
      checked.value.description === profile.description &&
      checked.value.industry === profile.industry &&
      checked.value.products.join("\n") === profile.products.join("\n") &&
      checked.value.customers.join("\n") === profile.customers.join("\n");
    const empty = !checked.value.description && !checked.value.industry && !checked.value.products.length && !checked.value.customers.length;
    if (unchanged || empty) return advance(empty && unchanged ? "skipped" : "saved");
    setBusy(true);
    const res = await saveOrgProfile(checked.value);
    setBusy(false);
    if (!res.ok) {
      setAboutErrors(res.fieldErrors ?? {});
      notifyError(res.message);
      return;
    }
    setProfile({ ...res.data, description: res.data.description || checked.value.description });
    advance("saved");
  };

  const saveWords = async () => {
    const filled = termRows.filter((r) => r.term.trim());
    if (!filled.length) return advance("skipped");
    const values = [];
    for (const r of filled) {
      const c = validateTerm({ term: r.term, kind: r.kind, definition: r.definition, aliases: [] });
      if (!c.ok) {
        setTermError(`${r.term.trim() || "A term"}: ${Object.values(c.errors).find(Boolean)}`);
        return;
      }
      values.push(c.value);
    }
    setTermError(null);
    setBusy(true);
    const res = await importTerms(values);
    setBusy(false);
    if (!res.ok) {
      notifyError(res.message);
      return;
    }
    setTerms(res.data);
    setTermRows([termRow(), termRow(), termRow()]);
    advance("saved");
  };

  const saveOwners = async () => {
    const filled = ownerRows.filter((r) => r.topic.trim() || r.owner);
    if (!filled.length) return advance("skipped");
    for (const r of filled) {
      const c = validateOwner({ topic: r.topic, owner_user_id: r.owner ?? "" }, owners);
      if (!c.ok) {
        setOwnerError(`${r.topic.trim() || "A row"}: ${Object.values(c.errors).find(Boolean)}`);
        return;
      }
    }
    setOwnerError(null);
    setBusy(true);
    const results = await Promise.all(filled.map((r) => createOwner({ topic: r.topic, owner_user_id: r.owner ?? "" })));
    setBusy(false);
    const saved = results.flatMap((r) => (r.ok ? [r.data] : []));
    const failedRows = filled.filter((_, i) => !results[i].ok);
    setOwners((o) => [...o, ...saved]);
    if (failedRows.length) {
      const first = results.find((r) => !r.ok);
      setOwnerRows(failedRows);
      notifyError(first && !first.ok ? first.message : "Some owners were not saved.");
      return;
    }
    setOwnerRows([ownerRow(), ownerRow(), ownerRow()]);
    advance("saved");
  };

  const saveGoal = async () => {
    if (!goalTitle.trim()) return advance("skipped");
    const active = goals.filter((g) => g.status === "active").length;
    const c = validateGoal({ title: goalTitle, description: "", period: goalPeriod, status: "active", owner_user_id: goalOwner }, active);
    if (!c.ok) {
      setGoalError(Object.values(c.errors).find(Boolean) ?? null);
      return;
    }
    setGoalError(null);
    setBusy(true);
    const res = await createGoal({ ...c.value, position: goals.length });
    setBusy(false);
    if (!res.ok) {
      setGoalError(res.fieldErrors?.title ?? null);
      notifyError(res.message);
      return;
    }
    setGoals((g) => [...g, res.data]);
    setGoalTitle("");
    advance("saved");
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (key === "about") void saveAbout();
    else if (key === "words") void saveWords();
    else if (key === "owners") void saveOwners();
    else if (key === "goal") void saveGoal();
  };

  const onTermPaste = (e: ClipboardEvent<HTMLInputElement>, rowKey: number) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const parsed = parseGlossaryImport(text, { max: 50 });
    if (!parsed.rows.length) return;
    setTermRows((rows) => {
      const at = rows.findIndex((r) => r.key === rowKey);
      const pasted = parsed.rows.map((p) => termRow(p.term, p.kind, p.definition ?? ""));
      const kept = rows.filter((r, i) => i < at || (i > at && r.term.trim()));
      return [...kept.slice(0, at), ...pasted, ...kept.slice(at)];
    });
    notifySuccess(`${parsed.rows.length} lines pasted as words`);
  };

  const back = step > 0 && key !== "done" ? () => setStep((s) => s - 1) : undefined;
  const skip = () => advance("skipped");

  /* ---- render ---- */

  return (
    <div className="min-h-[100dvh] bg-bg font-sans">
      {/* Onboarding sits outside the app shell, so the setup mounts the toast surface itself. */}
      <Toaster />
      <header className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/dashboard" aria-label="Mytheus, go to your dashboard" className="rounded-ctl">
          <Wordmark size={22} textClassName="text-[22px]" />
        </Link>
        <div className="text-right text-[14px] text-ink-3">
          <OnboardingAside email={email} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1320px] px-4 pb-16 sm:px-8">
        <p className="mb-5 text-[14px] text-ink-3 lg:mb-8">
          Setting up <span className="font-semibold text-ink">{orgName}</span>. About five minutes, and every step can wait.
        </p>

        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
          {/* the steps: a rail from lg, a short line above the step below it */}
          <div className="lg:sticky lg:top-6">
            <div className="hidden lg:block">
              <Rail step={step} outcomes={outcomes} onGo={(i) => setStep(i)} />
            </div>
            <div className="lg:hidden" aria-hidden>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-[3px] flex-1 rounded-full ${i <= step ? "bg-[var(--signal-line)]" : "bg-line-2"}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <main className="min-w-0 rounded-hero border border-line bg-surface px-5 py-7 shadow-warm-1 sm:px-8 sm:py-9 lg:px-10">
            {key === "done" ? (
              <div>
                <p className="text-[14px] font-semibold text-signal-ink">All set for now</p>
                <h1 className="display mt-1.5 text-[clamp(28px,3vw,34px)] text-ink">Your agents know {orgName}</h1>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink-3">
                  From the next meeting on, every agent reads what you saved. The meter shows what is left; each open check links to
                  the page that finishes it, in the company brain in the Workspace console.
                </p>
                <div className="mt-6">
                  <ReadinessMeter readiness={readiness ?? derived} id="setup-readiness" />
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Button size="lg" onClick={() => router.push("/dashboard")}>
                    Open your dashboard
                  </Button>
                  <LinkButton href="/workspace/brain" variant="outline" size="lg">
                    Open the company brain
                  </LinkButton>
                </div>
              </div>
            ) : (
              <form key={key} onSubmit={submit} noValidate aria-busy={busy || undefined}>
                {key === "about" ? (
                  <StepFrame
                    index={step}
                    title="What does the company do?"
                    lead="Say it the way you would to a new hire. Agents read this before every meeting, so they know what your work is about."
                    busy={busy}
                    primary="Save and continue"
                    onSkip={skip}
                  >
                    <div className="grid gap-5">
                      <div>
                        <div className="flex items-baseline justify-between gap-3">
                          <label htmlFor="setup-description" className="text-[15px] font-semibold text-ink">
                            In a few sentences
                          </label>
                          <Count n={description.trim().length} max={BRAIN_LIMITS.profile.description} />
                        </div>
                        <textarea
                          id="setup-description"
                          value={description}
                          onChange={(e) => {
                            setDescription(e.target.value);
                            setAboutErrors((x) => ({ ...x, description: undefined }));
                          }}
                          rows={5}
                          placeholder="We make Nimbus, invoicing software for small accounting firms in the UK and Ireland."
                          aria-invalid={aboutErrors.description ? true : undefined}
                          aria-describedby="setup-description-msg"
                          className={`mt-1.5 !resize-y ${textareaClass} ${aboutErrors.description ? "!border-priority-high" : ""}`}
                        />
                        <FieldMsg
                          id="setup-description-msg"
                          error={aboutErrors.description}
                          hint={`At least ${BRAIN_LIMITS.profile.descriptionReady} characters counts toward readiness.`}
                        />
                      </div>
                      <div>
                        <label htmlFor="setup-industry" className="text-[15px] font-semibold text-ink">
                          Industry <span className="font-normal text-ink-3">(optional)</span>
                        </label>
                        <input
                          id="setup-industry"
                          value={industry}
                          onChange={(e) => setIndustry(e.target.value)}
                          placeholder="Accounting software"
                          autoComplete="off"
                          aria-invalid={aboutErrors.industry ? true : undefined}
                          aria-describedby={aboutErrors.industry ? "setup-industry-msg" : undefined}
                          className={`mt-1.5 ${fieldClass}`}
                        />
                        <FieldMsg id="setup-industry-msg" error={aboutErrors.industry} />
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="min-w-0">
                          <label htmlFor="setup-products" className="text-[15px] font-semibold text-ink">
                            Products
                          </label>
                          <div className="mt-1.5">
                            <ChipInput
                              id="setup-products"
                              value={products}
                              onChange={setProducts}
                              max={BRAIN_LIMITS.profile.products.max}
                              itemMax={BRAIN_LIMITS.profile.products.itemMax}
                              placeholder="Nimbus, Nimbus Payroll"
                              describedBy="setup-products-msg"
                              invalid={!!aboutErrors.products}
                              noun="product"
                            />
                          </div>
                          <FieldMsg id="setup-products-msg" error={aboutErrors.products} hint="Press Enter after each one." />
                        </div>
                        <div className="min-w-0">
                          <label htmlFor="setup-customers" className="text-[15px] font-semibold text-ink">
                            Customers
                          </label>
                          <div className="mt-1.5">
                            <ChipInput
                              id="setup-customers"
                              value={customers}
                              onChange={setCustomers}
                              max={BRAIN_LIMITS.profile.customers.max}
                              itemMax={BRAIN_LIMITS.profile.customers.itemMax}
                              placeholder="Acme Accounting"
                              describedBy="setup-customers-msg"
                              invalid={!!aboutErrors.customers}
                              noun="customer"
                            />
                          </div>
                          <FieldMsg id="setup-customers-msg" error={aboutErrors.customers} hint="Names people say out loud in meetings." />
                        </div>
                      </div>
                    </div>
                  </StepFrame>
                ) : null}

                {key === "words" ? (
                  <StepFrame
                    index={step}
                    title="Which words would a new hire not know?"
                    lead="Product names, codenames, acronyms. Agents learn what they mean, and captions learn to spell them. A few now is plenty; paste a list into any row to add many."
                    busy={busy}
                    primary={termRows.some((r) => r.term.trim()) ? "Save and continue" : "Continue"}
                    onSkip={skip}
                    onBack={back}
                  >
                    {termSuggestions.length ? (
                      <div className="mb-5">
                        <p className="text-[14px] font-semibold text-ink-3">From your answers</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {termSuggestions.slice(0, 10).map((s) => (
                            <li key={s.term}>
                              <button
                                type="button"
                                onClick={() =>
                                  setTermRows((rows) => {
                                    const i = rows.findIndex((r) => !r.term.trim());
                                    const next = termRow(s.term, s.kind);
                                    return i === -1 ? [...rows, next] : rows.map((r, j) => (j === i ? next : r));
                                  })
                                }
                                aria-label={`Add ${s.term} as a ${KIND_LABEL[s.kind].toLowerCase()}`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line-2 px-3 text-[14px] font-medium text-ink-2 transition-colors hover:border-solid hover:bg-surface-2 hover:text-ink"
                              >
                                <Plus size={13} weight="bold" aria-hidden />
                                {s.term}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {terms.length ? (
                      <p className="mb-4 text-[14px] text-ink-3">
                        {terms.length} {terms.length === 1 ? "word is" : "words are"} already saved.
                      </p>
                    ) : null}
                    <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_132px_40px] gap-2 pb-1.5 text-[12.5px] font-semibold text-ink-3 md:grid" aria-hidden>
                      <span>Word</span>
                      <span>What it means</span>
                      <span>Kind</span>
                      <span />
                    </div>
                    <ul className="grid gap-3 md:gap-2" aria-label="Words to add">
                      {termRows.map((r, i) => (
                        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 rounded-ctl border border-line p-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_132px_40px] md:border-0 md:p-0">
                          <div className="min-w-0">
                            <label htmlFor={`w-${r.key}`} className="sr-only">
                              Word {i + 1}
                            </label>
                            <input
                              id={`w-${r.key}`}
                              value={r.term}
                              onChange={(e) => setTermRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, term: e.target.value } : x)))}
                              onPaste={(e) => onTermPaste(e, r.key)}
                              placeholder={i === 0 ? "Nimbus" : i === 1 ? "ARR" : "Word"}
                              autoComplete="off"
                              className={`${fieldClass} !h-10`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setTermRows((rows) => (rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [termRow()]))}
                            aria-label={`Remove word ${i + 1}`}
                            className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink md:order-last"
                          >
                            <X size={16} aria-hidden />
                          </button>
                          <div className="col-span-2 min-w-0 md:col-span-1">
                            <label htmlFor={`d-${r.key}`} className="sr-only">
                              What word {i + 1} means
                            </label>
                            <input
                              id={`d-${r.key}`}
                              value={r.definition}
                              onChange={(e) => setTermRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, definition: e.target.value } : x)))}
                              placeholder={i === 0 ? "Our invoicing product" : i === 1 ? "Annual recurring revenue" : "What it means (optional)"}
                              autoComplete="off"
                              className={`${fieldClass} !h-10`}
                            />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <Select
                              value={r.kind}
                              onChange={(k) => setTermRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, kind: k } : x)))}
                              options={KIND_OPTIONS}
                              label={`Kind of word ${i + 1}`}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setTermRows((rows) => [...rows, termRow()])}
                      disabled={termRows.length >= 50}
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-ctl px-2 text-[14px] font-semibold text-ink-2 hover:bg-bg-2 hover:text-ink disabled:opacity-40"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Add another word
                    </button>
                    <FieldMsg id="setup-words-msg" error={termError} />
                  </StepFrame>
                ) : null}

                {key === "owners" ? (
                  <StepFrame
                    index={step}
                    title="Who owns what?"
                    lead="A topic and the one person to ask about it. Agents suggest them as owners of new actions. Three or four is a good start."
                    busy={busy}
                    primary={ownerRows.some((r) => r.topic.trim()) ? "Save and continue" : "Continue"}
                    onSkip={skip}
                    onBack={back}
                  >
                    {members.length <= 1 ? (
                      <p className="mb-4 rounded-ctl bg-bg-2 px-4 py-3 text-[14px] leading-relaxed text-ink-2">
                        You are the only one here so far, so you can own topics yourself and hand them over once your team joins.
                      </p>
                    ) : null}
                    {ownerSuggestions.length ? (
                      <div className="mb-5">
                        <p className="text-[14px] font-semibold text-ink-3">Common topics</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {ownerSuggestions.map((t) => (
                            <li key={t}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOwnerRows((rows) => {
                                    const i = rows.findIndex((r) => !r.topic.trim());
                                    return i === -1 ? [...rows, ownerRow(t)] : rows.map((r, j) => (j === i ? { ...r, topic: t } : r));
                                  })
                                }
                                aria-label={`Add the topic ${t}`}
                                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line-2 px-3 text-[14px] font-medium text-ink-2 transition-colors hover:border-solid hover:bg-surface-2 hover:text-ink"
                              >
                                <Plus size={13} weight="bold" aria-hidden />
                                {t}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <ul className="grid gap-3 md:gap-2" aria-label="Topics and owners">
                      {ownerRows.map((r, i) => (
                        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_40px] gap-2 rounded-ctl border border-line p-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_40px] md:border-0 md:p-0">
                          <div className="min-w-0">
                            <label htmlFor={`o-${r.key}`} className="sr-only">
                              Topic {i + 1}
                            </label>
                            <input
                              id={`o-${r.key}`}
                              value={r.topic}
                              onChange={(e) => setOwnerRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, topic: e.target.value } : x)))}
                              placeholder={i === 0 ? "Pricing" : "Topic"}
                              autoComplete="off"
                              className={`${fieldClass} !h-10`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setOwnerRows((rows) => (rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [ownerRow()]))}
                            aria-label={`Remove topic ${i + 1}`}
                            className="grid h-10 w-10 place-items-center rounded-ctl text-ink-3 hover:bg-bg-2 hover:text-ink md:order-last"
                          >
                            <X size={16} aria-hidden />
                          </button>
                          <div className="col-span-2 min-w-0 md:col-span-1">
                            <MemberPicker
                              members={members}
                              value={r.owner}
                              onChange={(id) => setOwnerRows((rows) => rows.map((x) => (x.key === r.key ? { ...x, owner: id } : x)))}
                              label={`Owner of topic ${i + 1}`}
                              size="sm"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setOwnerRows((rows) => [...rows, ownerRow()])}
                      className="mt-3 inline-flex h-10 items-center gap-2 rounded-ctl px-2 text-[14px] font-semibold text-ink-2 hover:bg-bg-2 hover:text-ink"
                    >
                      <Plus size={15} weight="bold" aria-hidden />
                      Add another topic
                    </button>
                    <FieldMsg id="setup-owners-msg" error={ownerError} />
                  </StepFrame>
                ) : null}

                {key === "goal" ? (
                  <StepFrame
                    index={step}
                    title="What matters most right now?"
                    lead="One goal is enough. Hosts tie agenda items to it, and agents keep what moves it forward."
                    busy={busy}
                    primary={goalTitle.trim() ? "Save and finish" : "Finish"}
                    onSkip={skip}
                    onBack={back}
                  >
                    <div className="grid gap-5">
                      <div>
                        <label htmlFor="setup-goal" className="text-[15px] font-semibold text-ink">
                          The goal
                        </label>
                        <input
                          id="setup-goal"
                          value={goalTitle}
                          onChange={(e) => {
                            setGoalTitle(e.target.value);
                            setGoalError(null);
                          }}
                          placeholder="Move 40 firms onto Nimbus before January"
                          autoComplete="off"
                          aria-invalid={goalError ? true : undefined}
                          aria-describedby={goalError ? "setup-goal-msg" : undefined}
                          className={`mt-1.5 ${fieldClass} ${goalError ? "!border-priority-high" : ""}`}
                        />
                        <FieldMsg id="setup-goal-msg" error={goalError} />
                      </div>
                      <div className="grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]">
                        <div>
                          <label htmlFor="setup-period" className="text-[15px] font-semibold text-ink">
                            Period
                          </label>
                          <input
                            id="setup-period"
                            value={goalPeriod}
                            onChange={(e) => setGoalPeriod(e.target.value)}
                            placeholder="2026-Q4"
                            autoComplete="off"
                            className={`mt-1.5 ${fieldClass}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[15px] font-semibold text-ink">
                            Owner <span className="font-normal text-ink-3">(optional)</span>
                          </span>
                          <div className="mt-1.5">
                            <MemberPicker members={members} value={goalOwner} onChange={setGoalOwner} label="Goal owner" allowNone />
                          </div>
                        </div>
                      </div>
                    </div>
                  </StepFrame>
                ) : null}
              </form>
            )}
          </main>

          <div className="hidden xl:sticky xl:top-6 xl:block">
            <Known profile={profile} terms={terms} owners={owners} goals={goals} members={members} />
          </div>
        </div>
      </div>
    </div>
  );
}
