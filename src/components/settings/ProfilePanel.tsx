"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { LockSimple } from "@phosphor-icons/react";
import { DoodlePicker } from "@/components/ui/DoodlePicker";
import { defaultDoodleSeed, isDoodleSeed } from "@/lib/doodle";
import { saveDoodle } from "@/lib/doodle-client";
import { refreshMyProfile, saveAgentProfile } from "@/app/actions/profile";
import type { AgentProfile } from "@/lib/api/profile";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormFooter, Note, SaveStatus, SectionCard, SettingsRow, focusPill, inputClass } from "./primitives";

/* Profile: who you are and the role and focus that tune what your PersonalListener captures.
   The name is your Clerk account's (saved there, then the cached profile is dropped); role and
   focus areas are `users.role` / `users.skills`, read from `get_user_context()` and saved by
   `saveAgentProfile`. The email comes from the sign-in, so it is shown read-only. When the
   profile cannot be loaded the agent card says so instead of showing blank fields to save. */
export function ProfilePanel({ agent }: { agent: AgentProfile | null }) {
  const { user } = useOrgContext();
  const { user: clerkUser } = useUser();
  const router = useRouter();

  const [savedName, setSavedName] = useState(user.name);
  const [name, setName] = useState(user.name);
  const [nameState, setNameState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const initial = { title: agent?.role ?? "", focus: (agent?.skills ?? []).join(", ") };
  const [saved, setSaved] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [focus, setFocus] = useState(initial.focus);
  const [agentState, setAgentState] = useState<"idle" | "saving" | "saved">("idle");
  const [agentError, setAgentError] = useState<string | null>(null);

  const nameDirty = name.trim() !== savedName && name.trim() !== "";
  const agentDirty = title !== saved.title || focus !== saved.focus;

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

  const saveAgent = async () => {
    setAgentState("saving");
    setAgentError(null);
    const result = await saveAgentProfile({ role: title, focus });
    if (result.ok) {
      const next = { title: result.profile.role, focus: result.profile.skills.join(", ") };
      setSaved(next);
      setTitle(next.title);
      setFocus(next.focus);
      setAgentState("saved");
    } else {
      setAgentState("idle");
      setAgentError(result.message);
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

      <SectionCard
        title="What your agent knows about you"
        description="Your role and focus areas tune what your agent captures. An engineer and a PM leave the same meeting with different notes."
      >
        {agent === null ? (
          <div className="px-4 py-4 sm:px-[22px]">
            <Note tone="warning">Your role and focus areas could not be loaded just now. Reload the page to try again.</Note>
          </div>
        ) : (
          <>
            <SettingsRow label="Role title" htmlFor="title" help="What you do, in your own words.">
              <Input
                id="title"
                name="title"
                value={title}
                maxLength={200}
                placeholder="Product manager"
                className={inputClass}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setAgentState("idle");
                }}
              />
            </SettingsRow>
            <SettingsRow label="Focus areas" htmlFor="focus" help="Topics your agent should listen for. Separate them with commas.">
              <Input
                id="focus"
                name="focus"
                value={focus}
                className={inputClass}
                onChange={(e) => {
                  setFocus(e.target.value);
                  setAgentState("idle");
                }}
                placeholder="Billing, infrastructure, hiring"
              />
            </SettingsRow>
            <FormFooter>
              <Button
                disabled={!agentDirty || agentState === "saving"}
                className={focusPill}
                onClick={() => void saveAgent()}
              >
                {agentState === "saving" ? "Saving changes" : "Save changes"}
              </Button>
              <SaveStatus tone={agentError ? "error" : agentState === "saved" ? "ok" : undefined}>
                {agentError ?? (agentState === "saved" ? "Changes saved. Your agent uses them from now on." : "")}
              </SaveStatus>
            </FormFooter>
          </>
        )}
      </SectionCard>
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
