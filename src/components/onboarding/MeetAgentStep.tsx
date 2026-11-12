"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { BackLink, FormAlert, PrimaryButton, StepHeader, TextButton, TextField } from "@/components/auth/fields";
import { OrbPicker } from "@/components/agent/OrbPicker";
import { AgentPreviewCard } from "@/components/settings/AgentPreviewCard";
import { PersonalityPicker } from "@/components/settings/PersonalityPicker";
import { saveAgentPersona } from "@/app/actions/profile";
import {
  LIMITS,
  agentDisplayName,
  validatePersona,
  type AgentPersonality,
  type FieldErrors,
  type PersonaField,
} from "@/lib/api/profile-types";
import { AreaField, OnboardingAside } from "./fields";

/* Onboarding step 2 of 2, "Meet your agent" (ADR-0038 D2, D11): a name, a doodle face, one of
   five personalities and optional instructions, with the agent drawn live above the form and
   seated at the brand panel's table. Everything has a default, so "Skip for now" saves nothing
   and the agent works as "{first name}'s agent", balanced, with its derived face. A face left at
   its default is saved as NULL, so every surface keeps deriving the same one. */

const IDS: Record<PersonaField, string> = {
  agent_name: "ob-agent-name",
  agent_avatar_seed: "ob-agent-face",
  agent_personality: "ob-agent-personality",
  agent_instructions: "ob-agent-instructions",
};
const ORDER: PersonaField[] = ["agent_name", "agent_avatar_seed", "agent_personality", "agent_instructions"];

export function MeetAgentStep({
  initial,
  defaultSeed,
  personName,
  email,
  nextHref = "/dashboard",
}: {
  initial: {
    agent_name: string | null;
    agent_avatar_seed: string | null;
    agent_personality: AgentPersonality;
    agent_instructions: string | null;
  } | null;
  /** the face the agent has when none was chosen (derived from `users.id`) */
  defaultSeed: string;
  personName: string;
  email: string;
  /** where Save and Skip lead: the dashboard, or the company brain setup for a new workspace's admin */
  nextHref?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.agent_name ?? "");
  const [seed, setSeed] = useState(initial?.agent_avatar_seed ?? defaultSeed);
  const [personality, setPersonality] = useState<AgentPersonality>(initial?.agent_personality ?? "balanced");
  const [instructions, setInstructions] = useState(initial?.agent_instructions ?? "");
  const [errors, setErrors] = useState<FieldErrors<PersonaField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState<"save" | "skip" | null>(null);

  const shownName = agentDisplayName(name, personName);
  const defaultName = agentDisplayName(null, personName);

  const go = (why: "save" | "skip") => {
    setLeaving(why);
    router.push(nextHref);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || leaving) return;
    const input = {
      agent_name: name,
      agent_avatar_seed: seed === defaultSeed ? "" : seed,
      agent_personality: personality,
      agent_instructions: instructions,
    };
    const checked = validatePersona(input);
    const fail = (errs: FieldErrors<PersonaField>) => {
      setErrors(errs);
      const first = ORDER.find((f) => errs[f]);
      if (first) document.getElementById(IDS[first])?.focus();
    };
    if (!checked.ok) return fail(checked.errors);
    setSaving(true);
    setErrors({});
    setFormError(null);
    const result = await saveAgentPersona(input);
    if (result.ok) return go("save");
    setSaving(false);
    if (result.fieldErrors && Object.keys(result.fieldErrors).length) fail(result.fieldErrors);
    else setFormError(result.message);
  };

  return (
    <AuthShell
      stage={{
        title: "A face and a voice of its own.",
        lead: "Your agent sits beside you in every meeting and writes your notes the way you like to read them.",
      }}
      scene={{
        you: seed,
        lines: [
          { who: 0, text: "Where did we land on pricing?" },
          { who: 4, text: "Annual plans, 20% off.", keep: { tag: "Decision", text: "Annual plans at 20% off" } },
          { who: 1, text: "I'll update the deck.", keep: { tag: "Action", text: "Raj updates the deck" } },
          { who: 3, text: "Who signs off the copy?", keep: { tag: "Question", text: "Who signs off the copy?" } },
        ],
      }}
      aside={<OnboardingAside email={email} />}
    >
      <BackLink href="/onboarding/profile">Back to about you</BackLink>
      <StepHeader kicker="Step 2 of 2" title="Meet your agent">
        Give it a name, a face and a way of writing. You can change any of it later in Settings.
      </StepHeader>

      {formError ? (
        <FormAlert>
          {formError}{" "}
          <TextButton className="!text-priority-high" onClick={() => go("skip")}>
            Continue without saving
          </TextButton>
        </FormAlert>
      ) : null}

      <AgentPreviewCard
        name={shownName}
        seed={seed}
        personality={personality}
        instructions={instructions}
        ownerName={personName}
        className="mb-6"
      />

      <form onSubmit={submit} noValidate className="space-y-6" aria-busy={saving || undefined}>
        <TextField
          id={IDS.agent_name}
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (errors.agent_name) setErrors((x) => ({ ...x, agent_name: undefined }));
          }}
          maxLength={LIMITS.agentName}
          autoComplete="off"
          placeholder={defaultName}
          error={errors.agent_name}
          hint={`Leave it blank to keep "${defaultName}".`}
        />

        <div id={IDS.agent_avatar_seed} tabIndex={-1} className="rounded-ctl focus-visible:outline-none">
          <OrbPicker
            value={seed}
            onChange={(s) => {
              setSeed(s);
              if (errors.agent_avatar_seed) setErrors((x) => ({ ...x, agent_avatar_seed: undefined }));
            }}
            label="Its face"
            size="sm"
          />
          {errors.agent_avatar_seed ? (
            <p role="alert" className="mt-1.5 text-[13px] text-priority-high">
              {errors.agent_avatar_seed}
            </p>
          ) : null}
        </div>

        <div id={IDS.agent_personality} tabIndex={-1} className="rounded-ctl focus-visible:outline-none">
          <PersonalityPicker
            name="ob-personality"
            value={personality}
            onChange={setPersonality}
            legend="Personality"
            legendClassName="mb-1.5 block text-[14px] font-semibold text-ink"
          />
          <p className="mt-2 text-[13px] leading-snug text-ink-3">
            Changes how your notes are worded, never what is kept or who sees it.
          </p>
        </div>

        <AreaField
          id={IDS.agent_instructions}
          label="Instructions"
          optional
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            if (errors.agent_instructions) setErrors((x) => ({ ...x, agent_instructions: undefined }));
          }}
          rows={3}
          max={LIMITS.agentInstructions}
          placeholder="Always note numbers and dates. Use British spelling."
          error={errors.agent_instructions}
          hint="Anything else about how it should write for you."
        />

        <div className="space-y-4">
          <PrimaryButton loading={saving || leaving === "save"} disabled={leaving === "skip"}>
            {saving ? "Saving" : nextHref === "/dashboard" ? "Save and open your dashboard" : "Save and continue"}
          </PrimaryButton>
          <p className="text-center text-[14px] text-ink-3">
            <TextButton onClick={() => go("skip")} disabled={saving || !!leaving}>
              Skip for now
            </TextButton>{" "}
            and use the defaults
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
