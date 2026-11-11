"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LockSimple } from "@phosphor-icons/react";
import { DoodlePicker } from "@/components/ui/DoodlePicker";
import { defaultDoodleSeed, isDoodleSeed } from "@/lib/doodle";
import { saveDoodle } from "@/lib/doodle-client";
import { refreshMyProfile, saveDisplayName, saveWorkingProfile } from "@/app/actions/profile";
import { LIMITS, type FieldErrors, type ProfileField, type UserProfile } from "@/lib/api/profile-types";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CardFoot as FormFooter, SectionCard } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CharCount, FieldMsg, FieldRow as SettingsRow, inputClass, textareaClass } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/ErrorState";
import { notifyError, notifySuccess } from "@/lib/toast";
import { ChipInput } from "./ChipInput";

/* Profile: who you are, and the working profile that tunes what your PersonalListener captures.
   The name is your Clerk account's (saved there, then copied to `users.display_name` so the
   backend greets you by it, then the cached profile is dropped); the role,
   what you work on, focus areas, listen for and ignore are `users` columns (ADR-0038 D1), read
   from `GET /users/me` and saved by `saveWorkingProfile`. The email comes from the sign-in, so it
   is shown read-only. When the profile cannot be loaded the card says so instead of showing
   blank fields to save. Every save answers with a toast in the button's verb, with Undo. */
export function ProfilePanel({ profile }: { profile: UserProfile | null }) {
  const { user } = useOrgContext();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [savedName, setSavedName] = useState(user.name);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);

  const nameDirty = name.trim() !== savedName && name.trim() !== "";

  const saveName = async (value: string, isUndo = false) => {
    if (!clerkUser) return;
    const trimmed = value.trim();
    const before = savedName;
    const [firstName, ...rest] = trimmed.split(/\s+/);
    setSaving(true);
    try {
      await clerkUser.update({ firstName, lastName: rest.join(" ") });
      // Then Mytheus's own copy, which briefings and agent names read. Clerk is already saved,
      // so a failure here is not the user's problem: the app layout's sync sets it on a later
      // render. saveDisplayName never throws.
      await saveDisplayName(trimmed);
      await refreshMyProfile();
      setSavedName(trimmed);
      setName(trimmed);
      router.refresh();
      if (isUndo) notifySuccess("Name restored", { description: trimmed });
      else notifySuccess("Name saved", { description: trimmed, undo: () => void saveName(before, true) });
    } catch {
      notifyError("Name not saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionCard title="Your account" description="How you appear to teammates in meetings, transcripts and tasks.">
        <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-[22px] md:py-5">
          <Avatar name={name || user.name} id={user.email} seed={user.avatarSeed} src={user.imageUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-ink">{name || user.name}</p>
            <p className="truncate text-[14px] text-ink-3">{user.email}</p>
          </div>
          <Chip className="shrink-0 capitalize">{user.role}</Chip>
        </div>
        <SettingsRow label="Full name" htmlFor="name" help="Used in transcripts and when your agent speaks for you.">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            className={inputClass}
            onChange={(e) => setName(e.target.value)}
          />
        </SettingsRow>
        <SettingsRow label="Email" htmlFor="email" help="Comes from your sign-in, so it cannot be edited here.">
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              value={user.email}
              readOnly
              aria-readonly="true"
              className={`pr-10 ${inputClass}`}
            />
            <LockSimple
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
          </div>
        </SettingsRow>
        <FormFooter>
          <Button disabled={!nameDirty || saving || !clerkUser} onClick={() => void saveName(name)}>
            {saving ? "Saving name" : "Save name"}
          </Button>
        </FormFooter>
      </SectionCard>

      <DoodleCard />

      <WorkingProfileCard profile={profile} />
    </>
  );
}

/* Your face across the product. The seed draws it here at once; saving also uploads the picture
   to Clerk, whose webhook copies it into `users.avatar_url` for every other surface. */
function DoodleCard() {
  const { user } = useOrgContext();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const current = isDoodleSeed(user.avatarSeed) ? user.avatarSeed : defaultDoodleSeed(user.email || user.id);
  const [seed, setSeed] = useState(current);
  const [saving, setSaving] = useState(false);

  const save = async (next: string, isUndo = false) => {
    if (!clerkUser) return;
    const before = current;
    setSaving(true);
    try {
      await saveDoodle(clerkUser, next);
      await refreshMyProfile();
      router.refresh();
      setSeed(next);
      if (isUndo) notifySuccess("Doodle restored");
      else notifySuccess("Doodle saved", { description: "Your teammates see it too.", undo: () => void save(before, true) });
    } catch {
      notifyError("Doodle not saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title="Your doodle"
      description="How you appear next to your name in meetings, tasks and decisions. Deal a few until one feels like you."
    >
      <div className="px-4 py-5 sm:px-[22px]">
        <DoodlePicker
          value={seed}
          onChange={setSeed}
        />
      </div>
      <FormFooter>
        <Button disabled={seed === current || saving || !isDoodleSeed(seed)} onClick={() => void save(seed)}>
          {saving ? "Saving doodle" : "Save doodle"}
        </Button>
      </FormFooter>
    </SectionCard>
  );
}

type Working = { role: string; bio: string; skills: string[]; listen_for: string[]; ignore_topics: string[] };

const fromProfile = (p: UserProfile): Working => ({
  role: p.role ?? "",
  bio: p.bio ?? "",
  skills: p.skills,
  listen_for: p.listen_for,
  ignore_topics: p.ignore_topics,
});

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/* What your agent knows about you: the five working-profile fields, saved together. Settings
   does not require a role or a minimum about the work (the API does not either); onboarding does. */
function WorkingProfileCard({ profile }: { profile: UserProfile | null }) {
  const [saved, setSaved] = useState<Working | null>(profile ? fromProfile(profile) : null);
  const [form, setForm] = useState<Working | null>(saved);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});

  const card = {
    title: "What your agent knows about you",
    description:
      "Your role and your work tune what your agent captures. An engineer and a PM leave the same meeting with different notes.",
  };

  if (!saved || !form) {
    return (
      <SectionCard {...card}>
        <ErrorState variant="inline" className="pt-4" title="What your agent knows about you could not be loaded" text="Nothing was lost. Try again in a moment." />
      </SectionCard>
    );
  }

  const dirty =
    form.role !== saved.role ||
    form.bio !== saved.bio ||
    !sameList(form.skills, saved.skills) ||
    !sameList(form.listen_for, saved.listen_for) ||
    !sameList(form.ignore_topics, saved.ignore_topics);

  const set = <K extends keyof Working>(key: K, value: Working[K]) => {
    setForm({ ...form, [key]: value });
    if (errors[key] || (key === "listen_for" && errors.ignore_topics))
      setErrors((e) => ({ ...e, [key]: undefined, ...(key === "listen_for" ? { ignore_topics: undefined } : {}) }));
  };

  const save = async (values: Working, isUndo = false) => {
    const before = saved;
    setSaving(true);
    setErrors({});
    const result = await saveWorkingProfile(values);
    setSaving(false);
    if (result.ok) {
      const next = fromProfile(result.profile);
      setSaved(next);
      setForm(next);
      if (isUndo) notifySuccess("Changes undone");
      else
        notifySuccess("Changes saved", {
          description: "Your agent uses them from its next meeting.",
          undo: () => void save(before, true),
        });
      return;
    }
    setErrors(result.fieldErrors ?? {});
    notifyError(result.message);
    const first = (["role", "bio", "skills", "listen_for", "ignore_topics"] as const).find((f) => result.fieldErrors?.[f]);
    if (first) document.getElementById(`pf-${first}`)?.focus();
  };

  const err = (f: ProfileField) => (errors[f] ? <FieldMsg id={`pf-${f}-err`} error={errors[f]} /> : null);
  const described = (f: ProfileField) => (errors[f] ? `pf-${f}-err` : undefined);

  return (
    <SectionCard {...card}>
      <SettingsRow label="Role" htmlFor="pf-role" help="What you do, in your own words.">
        <Input
          id="pf-role"
          name="role"
          value={form.role}
          maxLength={LIMITS.role}
          placeholder="Product manager"
          autoComplete="organization-title"
          aria-invalid={errors.role ? true : undefined}
          aria-describedby={described("role")}
          className={`${inputClass} ${errors.role ? "!border-priority-high" : ""}`}
          onChange={(e) => set("role", e.target.value)}
        />
        {err("role")}
      </SettingsRow>
      <SettingsRow
        label="What you work on"
        htmlFor="pf-bio"
        help="A sentence or two about your work right now. Your agent reads it before every meeting."
      >
        <textarea
          id="pf-bio"
          name="bio"
          rows={4}
          value={form.bio}
          placeholder="I run the billing team. This quarter we are moving invoices to the new payments API."
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={["pf-bio-count", described("bio")].filter(Boolean).join(" ")}
          className={`${textareaClass} resize-y ${errors.bio ? "!border-priority-high" : ""}`}
          onChange={(e) => set("bio", e.target.value)}
        />
        <p id="pf-bio-count" className="mt-1 text-right">
          <span className="sr-only">
            {form.bio.trim().length} of {LIMITS.bio} characters
          </span>
          <CharCount n={form.bio.trim().length} max={LIMITS.bio} />
        </p>
        {err("bio")}
      </SettingsRow>
      <SettingsRow label="Focus areas" htmlFor="pf-skills" help="Areas you own or care about. Press Enter or type a comma after each.">
        <ChipInput
          id="pf-skills"
          value={form.skills}
          onChange={(v) => set("skills", v)}
          max={LIMITS.skills.max}
          placeholder="Billing, infrastructure, hiring"
          noun="focus area"
          invalid={!!errors.skills}
          describedBy={described("skills")}
        />
        {err("skills")}
      </SettingsRow>
      <SettingsRow label="Listen for" htmlFor="pf-listen_for" help="Topics your agent should always note for you.">
        <ChipInput
          id="pf-listen_for"
          value={form.listen_for}
          onChange={(v) => set("listen_for", v)}
          max={LIMITS.listenFor.max}
          placeholder="Deadlines, pricing, anything about Q3"
          invalid={!!errors.listen_for}
          describedBy={described("listen_for")}
        />
        {err("listen_for")}
      </SettingsRow>
      <SettingsRow label="Ignore" htmlFor="pf-ignore_topics" help="Topics your agent can let pass.">
        <ChipInput
          id="pf-ignore_topics"
          value={form.ignore_topics}
          onChange={(v) => set("ignore_topics", v)}
          max={LIMITS.ignoreTopics.max}
          placeholder="Office logistics, lunch orders"
          invalid={!!errors.ignore_topics}
          describedBy={described("ignore_topics")}
        />
        {err("ignore_topics")}
      </SettingsRow>
      <FormFooter>
        <Button disabled={!dirty || saving} onClick={() => void save(form)}>
          {saving ? "Saving changes" : "Save changes"}
        </Button>
        {dirty && !saving ? (
          <Button
            variant="ghost"
            onClick={() => {
              setForm(saved);
              setErrors({});
            }}
          >
            Discard changes
          </Button>
        ) : null}
      </FormFooter>
    </SectionCard>
  );
}
