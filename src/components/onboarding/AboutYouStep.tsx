"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { FormAlert, PrimaryButton, StepHeader, TextButton, TextField } from "@/components/auth/fields";
import { saveWorkingProfile } from "@/app/actions/profile";
import {
  LIMITS,
  validateProfile,
  type FieldErrors,
  type ProfileField,
  type UserProfile,
} from "@/lib/api/profile-types";
import { AreaField, ChipField, OnboardingAside } from "./fields";

/* Onboarding step 1 of 2, "About you" (ADR-0038 D1, D11). The role and a few lines about the
   work are required here (the API itself does not require them); focus areas, listen for and
   ignore are optional chips. Saving goes on to "Meet your agent". If the save cannot reach the
   server, the person is never stuck: the error offers the dashboard, where a quiet prompt brings
   them back later. */

const ORDER: ProfileField[] = ["role", "bio", "skills", "listen_for", "ignore_topics"];
const IDS: Record<ProfileField, string> = {
  role: "ob-role",
  bio: "ob-bio",
  skills: "ob-skills",
  listen_for: "ob-listen",
  ignore_topics: "ob-ignore",
};

export function AboutYouStep({
  initial,
  email,
  youSeed,
}: {
  /** what is already saved; null when it could not be loaded */
  initial: UserProfile | null;
  email: string;
  youSeed: string;
}) {
  const router = useRouter();
  const [role, setRole] = useState(initial?.role ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(initial?.skills ?? []);
  const [listenFor, setListenFor] = useState<string[]>(initial?.listen_for ?? []);
  const [ignore, setIgnore] = useState<string[]>(initial?.ignore_topics ?? []);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const clear = (f: ProfileField) => {
    if (errors[f]) setErrors((e) => ({ ...e, [f]: undefined }));
  };

  const focusFirst = (errs: FieldErrors<ProfileField>) => {
    const first = ORDER.find((f) => errs[f]);
    if (first) document.getElementById(IDS[first])?.focus();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || leaving) return;
    const input = { role, bio, skills, listen_for: listenFor, ignore_topics: ignore };
    const checked = validateProfile(input, { onboarding: true });
    if (!checked.ok) {
      setErrors(checked.errors);
      setFormError(null);
      focusFirst(checked.errors);
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError(null);
    const result = await saveWorkingProfile(input, { onboarding: true });
    if (result.ok) {
      setLeaving(true);
      router.push("/onboarding/agent");
      return;
    }
    setSaving(false);
    if (result.fieldErrors && Object.keys(result.fieldErrors).length) {
      setErrors(result.fieldErrors);
      focusFirst(result.fieldErrors);
    } else setFormError(result.message);
  };

  return (
    <AuthShell
      stage={{
        title: "Your agent listens for your work.",
        lead: "An engineer and a PM leave the same meeting with different notes. Tell your agent what you do, and it keeps what matters to you.",
      }}
      scene={{
        you: youSeed,
        lines: [
          { who: 0, text: "Quick launch check." },
          { who: 1, text: "Billing changes ship Monday.", keep: { tag: "Action", text: "Billing ships Monday" } },
          { who: 3, text: "Who owns the API docs?", keep: { tag: "Question", text: "Who owns the API docs?" } },
          { who: 4, text: "Me, draft by Thursday.", keep: { tag: "Decision", text: "Diego drafts the API docs" } },
        ],
      }}
      aside={<OnboardingAside email={email} />}
    >
      <StepHeader kicker="Step 1 of 2" title="About you">
        Your agent takes notes for you in every meeting. A few lines here tell it what to listen for.
      </StepHeader>

      {initial === null ? (
        <FormAlert tone="info">We couldn&rsquo;t load anything you saved before. You can still fill this in.</FormAlert>
      ) : null}

      {formError ? (
        <FormAlert>
          {formError}{" "}
          <TextButton
            className="!text-priority-high"
            onClick={() => {
              setLeaving(true);
              router.push("/dashboard");
            }}
          >
            Continue to your dashboard
          </TextButton>
        </FormAlert>
      ) : null}

      <form onSubmit={submit} noValidate className="space-y-5" aria-busy={saving || undefined}>
        <TextField
          id={IDS.role}
          label="Your role"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            clear("role");
          }}
          maxLength={LIMITS.role}
          autoComplete="organization-title"
          placeholder="Product manager, backend engineer"
          error={errors.role}
          hint="What you do, in your own words."
          required
          aria-required="true"
          autoFocus
        />
        <AreaField
          id={IDS.bio}
          label="What you work on"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            clear("bio");
          }}
          rows={4}
          max={LIMITS.bio}
          min={LIMITS.bioMinOnboarding}
          placeholder="I run the billing team. This quarter we are moving invoices to the new payments API."
          error={errors.bio}
          hint={`A sentence or two, at least ${LIMITS.bioMinOnboarding} characters.`}
          required
          aria-required="true"
        />
        <ChipField
          id={IDS.skills}
          label="Focus areas"
          optional
          value={skills}
          onChange={(v) => {
            setSkills(v);
            clear("skills");
          }}
          max={LIMITS.skills.max}
          placeholder="Billing, infrastructure, hiring"
          noun="focus area"
          error={errors.skills}
          hint="Press Enter or type a comma after each one."
        />
        <ChipField
          id={IDS.listen_for}
          label="Listen for"
          optional
          value={listenFor}
          onChange={(v) => {
            setListenFor(v);
            clear("listen_for");
            clear("ignore_topics");
          }}
          max={LIMITS.listenFor.max}
          placeholder="Deadlines, pricing, anything about Q3"
          error={errors.listen_for}
          hint="Topics your agent should always note for you."
        />
        <ChipField
          id={IDS.ignore_topics}
          label="Ignore"
          optional
          value={ignore}
          onChange={(v) => {
            setIgnore(v);
            clear("ignore_topics");
          }}
          max={LIMITS.ignoreTopics.max}
          placeholder="Office logistics, lunch orders"
          error={errors.ignore_topics}
          hint="Topics your agent can let pass."
        />
        <PrimaryButton loading={saving || leaving}>{saving ? "Saving" : "Save and continue"}</PrimaryButton>
      </form>
    </AuthShell>
  );
}
