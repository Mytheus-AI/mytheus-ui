"use client";

import { useState } from "react";
import { DoodlePicker } from "@/components/ui/DoodlePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveAgentPersona } from "@/app/actions/profile";
import { useOrgContext } from "@/lib/org-context";
import {
  LIMITS,
  agentDisplayName,
  agentSeed,
  type AgentPersonality,
  type FieldErrors,
  type PersonaField,
  type UserProfile,
} from "@/lib/api/profile-types";
import { AgentPreviewCard } from "./AgentPreviewCard";
import { PersonalityPicker } from "./PersonalityPicker";
import { CardFoot as FormFooter, SectionCard, cardClass, cardPadX } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { FieldRow as SettingsRow, inputClass, textareaClass } from "@/components/ui/Form";
import { notifyError, notifySuccess } from "@/lib/toast";

/* Your agent (ADR-0038 D2): name, doodle face, personality and instructions, with the agent drawn
   live beside the form (above it below xl). Saved with `saveAgentPersona`; the agent fields are
   self only on the API. A face left at the derived default is saved as NULL, so every surface
   (the meeting room included) keeps deriving the same one from `users.id`. */

export type Persona = { name: string; seed: string; personality: AgentPersonality; instructions: string };

export function AgentPanel({
  profile,
  hidePreview = false,
  onChange,
}: {
  profile: UserProfile | null;
  /** the agent page draws its own live portrait, so it hides this one */
  hidePreview?: boolean;
  /** every change to the form, saved or not, for a preview drawn elsewhere */
  onChange?: (persona: Persona) => void;
}) {
  const { user } = useOrgContext();
  const defaultSeed = profile ? agentSeed(null, profile.id) : "";
  const initial: Persona | null = profile
    ? {
        name: profile.agent_name ?? "",
        seed: agentSeed(profile.agent_avatar_seed, profile.id),
        personality: profile.agent_personality,
        instructions: profile.agent_instructions ?? "",
      }
    : null;

  const [saved, setSaved] = useState(initial);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<PersonaField>>({});

  if (!profile || !saved || !form) {
    return (
      <SectionCard title="Your agent">
        <ErrorState variant="inline" className="pt-4" title="Your agent could not be loaded" text="Nothing was lost. Try again in a moment." />
      </SectionCard>
    );
  }

  const dirty =
    form.name !== saved.name ||
    form.seed !== saved.seed ||
    form.personality !== saved.personality ||
    form.instructions !== saved.instructions;

  const set = <K extends keyof Persona>(key: K, value: Persona[K]) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    onChange?.(nextForm);
    const field = ({ name: "agent_name", seed: "agent_avatar_seed", personality: "agent_personality", instructions: "agent_instructions" } as const)[key];
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const save = async (values: Persona, isUndo = false) => {
    const before = saved;
    setSaving(true);
    setErrors({});
    const result = await saveAgentPersona({
      agent_name: values.name,
      agent_avatar_seed: values.seed === defaultSeed ? "" : values.seed,
      agent_personality: values.personality,
      agent_instructions: values.instructions,
    });
    setSaving(false);
    if (result.ok) {
      const p = result.profile;
      const next: Persona = {
        name: p.agent_name ?? "",
        seed: agentSeed(p.agent_avatar_seed, p.id),
        personality: p.agent_personality,
        instructions: p.agent_instructions ?? "",
      };
      setSaved(next);
      setForm(next);
      onChange?.(next);
      if (isUndo) notifySuccess("Agent restored");
      else notifySuccess("Agent saved", { description: "Your next notes use its new voice.", undo: () => void save(before, true) });
      return;
    }
    setErrors(result.fieldErrors ?? {});
    notifyError(result.message);
    if (result.fieldErrors?.agent_name) document.getElementById("ag-name")?.focus();
    else if (result.fieldErrors?.agent_instructions) document.getElementById("ag-instructions")?.focus();
  };

  const defaultName = agentDisplayName(null, user.name);
  const instructionsLength = form.instructions.trim().length;

  return (
    <div className={`grid items-start gap-5 ${hidePreview ? "" : "xl:grid-cols-[minmax(0,1fr)_300px]"}`}>
      {hidePreview ? null : (
        <div className="xl:sticky xl:top-4 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <AgentPreviewCard
            name={agentDisplayName(form.name, user.name)}
            seed={form.seed}
            personality={form.personality}
            instructions={form.instructions}
            ownerName={user.name}
          />
        </div>
      )}

      <SectionCard
        title="Who it is"
        description="Your agent works only for you. Teammates see its name and face next to yours in meetings."
        className={hidePreview ? "" : "xl:col-start-1 xl:row-start-1"}
      >
        <SettingsRow label="Name" htmlFor="ag-name" help={`Leave it blank to keep "${defaultName}".`}>
          <Input
            id="ag-name"
            name="agent_name"
            value={form.name}
            maxLength={LIMITS.agentName}
            placeholder={defaultName}
            autoComplete="off"
            aria-invalid={errors.agent_name ? true : undefined}
            aria-describedby={errors.agent_name ? "ag-name-err" : undefined}
            className={`${inputClass} ${errors.agent_name ? "!border-priority-high" : ""}`}
            onChange={(e) => set("name", e.target.value)}
          />
          {errors.agent_name ? (
            <p id="ag-name-err" className="mt-1.5 text-[14px] text-priority-high">
              {errors.agent_name}
            </p>
          ) : null}
        </SettingsRow>
        <div className={`${cardPadX} py-4 md:py-[18px]`}>
          <DoodlePicker value={form.seed} onChange={(s) => set("seed", s)} label="Its face" />
          {errors.agent_avatar_seed ? (
            <p className="mt-2 text-[14px] text-priority-high">{errors.agent_avatar_seed}</p>
          ) : null}
          {form.seed !== defaultSeed ? (
            <button
              type="button"
              onClick={() => set("seed", defaultSeed)}
              className="mt-3 rounded-[4px] text-[14px] font-semibold text-ink-2 underline decoration-signal-line decoration-2 underline-offset-[5px] transition-colors hover:text-ink hover:decoration-signal"
            >
              Use its original face
            </button>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="How it writes"
        description="Changes how your notes and suggestions are worded, never what is kept or who can see it."
        className={hidePreview ? "" : "xl:col-start-1 xl:row-start-2"}
      >
        <div className={`${cardPadX} py-4 md:py-[18px]`}>
          <PersonalityPicker
            name="agent_personality"
            value={form.personality}
            onChange={(p) => set("personality", p)}
            legend="Personality"
            legendClassName="mb-3 block text-[15px] font-semibold text-ink"
          />
        </div>
        <SettingsRow
          label="Instructions"
          htmlFor="ag-instructions"
          help="Optional. Anything else about how it should write for you."
        >
          <textarea
            id="ag-instructions"
            name="agent_instructions"
            rows={4}
            value={form.instructions}
            placeholder="Always note numbers and dates. Use British spelling."
            aria-invalid={errors.agent_instructions ? true : undefined}
            aria-describedby={["ag-instructions-count", errors.agent_instructions ? "ag-instructions-err" : ""]
              .filter(Boolean)
              .join(" ")}
            className={`${textareaClass} resize-y ${errors.agent_instructions ? "!border-priority-high" : ""}`}
            onChange={(e) => set("instructions", e.target.value)}
          />
          <p
            id="ag-instructions-count"
            className={`mt-1 text-right text-[12.5px] tabular-nums ${
              instructionsLength > LIMITS.agentInstructions ? "text-priority-high" : "text-ink-3"
            }`}
          >
            {instructionsLength} of {LIMITS.agentInstructions} characters
          </p>
          {errors.agent_instructions ? (
            <p id="ag-instructions-err" className="mt-1 text-[14px] text-priority-high">
              {errors.agent_instructions}
            </p>
          ) : null}
        </SettingsRow>
      </SectionCard>

      <div className={cardClass({ flush: true, className: "xl:col-start-1 xl:row-start-3" })}>
        <FormFooter className="!border-t-0">
          <Button disabled={!dirty || saving} onClick={() => void save(form)}>
            {saving ? "Saving agent" : "Save agent"}
          </Button>
          {dirty && !saving ? (
            <Button
              variant="ghost"
              onClick={() => {
                setForm(saved);
                onChange?.(saved);
                setErrors({});
              }}
            >
              Discard changes
            </Button>
          ) : null}
        </FormFooter>
      </div>
    </div>
  );
}
