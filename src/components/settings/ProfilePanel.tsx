"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LockSimple } from "@phosphor-icons/react";
import { DoodlePicker } from "@/components/ui/DoodlePicker";
import { defaultDoodleSeed, isDoodleSeed } from "@/lib/doodle";
import { saveDoodle } from "@/lib/doodle-client";
import { refreshMyProfile, saveWorkingProfile } from "@/app/actions/profile";
import { LIMITS, type FieldErrors, type ProfileField, type UserProfile } from "@/lib/api/profile-types";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChipInput } from "./ChipInput";
import { FormFooter, Note, SaveStatus, SectionCard, SettingsRow, focusPill, inputClass, textareaClass } from "./primitives";

/* Profile: who you are, and the working profile that tunes what your PersonalListener captures.
   The name is your Clerk account's (saved there, then the cached profile is dropped); the role,
   what you work on, focus areas, listen for and ignore are `users` columns (ADR-0038 D1), read
   from `GET /users/me` and saved by `saveWorkingProfile`. The email comes from the sign-in, so it
   is shown read-only. When the profile cannot be loaded the card says so instead of showing
   blank fields to save. */
export function ProfilePanel({ profile }: { profile: UserProfile | null }) {
  const { user } = useOrgContext();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [savedName, setSavedName] = useState(user.name);
  const [name, setName] = useState(user.name);
  const [nameState, setNameState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const nameDirty = name.trim() !== savedName && name.trim() !== "";

  const saveName = async () => {
    if (!clerkUser) return;
    const trimmed = name.trim();
    const [firstName, ...rest] = trimmed.split(/\s+/);
    setNameState("saving");
    try {
      await clerkUser.update({ firstName, lastName: rest.join(" ") });
      await refreshMyProfile();
      setSavedName(trimmed);
      setName(trimmed);
      setNameState("saved");
      router.refresh();
    } catch {
      setNameState("error");
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
          <Badge className="shrink-0 capitalize">
            {user.role}
          </Badge>
        </div>
        <SettingsRow label="Full name" htmlFor="name" help="Used in transcripts and when your agent speaks for you.">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            className={inputClass}
            onChange={(e) => {
              setName(e.target.value);
              setNameState("idle");
            }}
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
          <Button
            disabled={!nameDirty || nameState === "saving" || !clerkUser}
            className={focusPill}
            onClick={() => void saveName()}
          >
            {nameState === "saving" ? "Saving name" : "Save name"}
          </Button>
          <SaveStatus tone={nameState === "saved" ? "ok" : nameState === "error" ? "error" : undefined}>
            {nameState === "saved" ? "Name saved." : nameState === "error" ? "Name not saved. Try again." : ""}
          </SaveStatus>
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
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    if (!clerkUser) return;
    setState("saving");
    try {
      await saveDoodle(clerkUser, seed);
      await refreshMyProfile();
      router.refresh();
      setState("saved");
    } catch {
      setState("error");
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
          onChange={(s) => {
            setSeed(s);
            setState("idle");
          }}
        />
      </div>
      <FormFooter>
        <Button
          disabled={seed === current || state === "saving" || !isDoodleSeed(seed)}
          className={focusPill}
          onClick={() => void save()}
        >
          {state === "saving" ? "Saving doodle" : "Use this doodle"}
        </Button>
        <SaveStatus tone={state === "saved" ? "ok" : state === "error" ? "error" : undefined}>
          {state === "saved"
            ? "Now using this doodle. Your teammates see it too."
            : state === "error"
              ? "Doodle not used. Try again."
              : ""}
        </SaveStatus>
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
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});

  const card = {
    title: "What your agent knows about you",
    description:
      "Your role and your work tune what your agent captures. An engineer and a PM leave the same meeting with different notes.",
  };

  if (!saved || !form) {
    return (
      <SectionCard {...card}>
        <div className="px-4 py-4 sm:px-[22px]">
          <Note tone="warning">What your agent knows about you could not be loaded just now. Reload the page to try again.</Note>
        </div>
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
    setState("idle");
    setMessage(null);
    if (errors[key] || (key === "listen_for" && errors.ignore_topics))
      setErrors((e) => ({ ...e, [key]: undefined, ...(key === "listen_for" ? { ignore_topics: undefined } : {}) }));
  };

  const save = async () => {
    setState("saving");
    setMessage(null);
    setErrors({});
    const result = await saveWorkingProfile(form);
    if (result.ok) {
      const next = fromProfile(result.profile);
      setSaved(next);
      setForm(next);
      setState("saved");
      return;
    }
    setState("idle");
    setErrors(result.fieldErrors ?? {});
    setMessage(result.message);
    const first = (["role", "bio", "skills", "listen_for", "ignore_topics"] as const).find((f) => result.fieldErrors?.[f]);
    if (first) document.getElementById(`pf-${first}`)?.focus();
  };

  const err = (f: ProfileField) =>
    errors[f] ? (
      <p id={`pf-${f}-err`} className="mt-1.5 text-[13.5px] leading-snug text-priority-high">
        {errors[f]}
      </p>
    ) : null;
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
        <p
          id="pf-bio-count"
          className={`mt-1 text-right text-[13px] tabular-nums ${form.bio.trim().length > LIMITS.bio ? "text-priority-high" : "text-ink-3"}`}
        >
          {form.bio.trim().length} of {LIMITS.bio} characters
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
        <Button disabled={!dirty || state === "saving"} className={focusPill} onClick={() => void save()}>
          {state === "saving" ? "Saving changes" : "Save changes"}
        </Button>
        {dirty && state !== "saving" ? (
          <Button
            variant="ghost"
            className={focusPill}
            onClick={() => {
              setForm(saved);
              setErrors({});
              setMessage(null);
            }}
          >
            Discard changes
          </Button>
        ) : null}
        <SaveStatus tone={message ? "error" : state === "saved" ? "ok" : undefined}>
          {message ?? (state === "saved" ? "Changes saved. Your agent uses them from its next meeting." : "")}
        </SaveStatus>
      </FormFooter>
    </SectionCard>
  );
}
