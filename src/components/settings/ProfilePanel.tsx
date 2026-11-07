"use client";

import { useState } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormFooter, SectionCard, SettingsRow, TextInput, focusPill } from "./primitives";

/* Profile: who you are and the role and focus that tune what your PersonalListener captures.
   Edits are local state only until the Server Action wires to the backend, as before. The email
   comes from the sign-in, so it is shown read-only. */
export function ProfilePanel() {
  const { user } = useOrgContext();

  const [saved, setSaved] = useState({
    name: user.name,
    title: "Founder",
    focus: "Product, frontend, fundraising",
  });
  const [name, setName] = useState(saved.name);
  const [title, setTitle] = useState(saved.title);
  const [focus, setFocus] = useState(saved.focus);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = name !== saved.name || title !== saved.title || focus !== saved.focus;
  const edit = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value);
    setJustSaved(false);
  };

  return (
    <>
      <SectionCard>
        <div className="flex items-center gap-4 px-4 py-4 sm:px-[22px] sm:py-5">
          <Avatar name={name || user.name} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-semibold text-ink">{name || user.name}</p>
            <p className="truncate text-[13px] text-ink-3">{user.email}</p>
          </div>
          <Badge tone="default" className="shrink-0 capitalize">
            {user.role}
          </Badge>
        </div>
        <SettingsRow
          label="Full name"
          htmlFor="name"
          help="Used in transcripts and when your agent speaks for you."
        >
          <TextInput id="name" name="name" autoComplete="name" value={name} onChange={edit(setName)} />
        </SettingsRow>
        <SettingsRow
          label="Email"
          htmlFor="email"
          help="Comes from your sign-in, so it cannot be edited here."
        >
          <div className="relative">
            <TextInput
              id="email"
              name="email"
              type="email"
              value={user.email}
              readOnly
              aria-readonly="true"
              className="pr-10"
            />
            <LockSimple
              size={16}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
          </div>
        </SettingsRow>
      </SectionCard>

      <SectionCard
        title="What your agent knows about you"
        description="Your role and focus areas tune what your agent captures. An engineer and a PM leave the same meeting with different notes."
      >
        <SettingsRow label="Role title" htmlFor="title">
          <TextInput id="title" name="title" value={title} onChange={edit(setTitle)} />
        </SettingsRow>
        <SettingsRow label="Focus areas" htmlFor="focus" help="Separate topics with commas.">
          <TextInput
            id="focus"
            name="focus"
            value={focus}
            onChange={edit(setFocus)}
            placeholder="e.g. Billing, infrastructure, hiring"
          />
        </SettingsRow>
        <FormFooter>
          <Button
            variant="secondary"
            disabled={!dirty}
            className={`active:opacity-80 ${focusPill}`}
            onClick={() => {
              setSaved({ name, title, focus });
              setJustSaved(true);
            }}
          >
            Save changes
          </Button>
          <span role="status" className="text-[13px] text-ink-3">
            {justSaved ? "Saved." : ""}
          </span>
        </FormFooter>
      </SectionCard>
    </>
  );
}
