"use client";

import { useState } from "react";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useOrgContext } from "@/lib/org-context";

/* Profile settings: who you are and — the part the agents care about — your
   role and focus, which tune what your PersonalListener captures for you.
   Saves are visual-state only until the Server Action wires to the backend. */

export default function ProfileSettingsPage() {
  const { user } = useOrgContext();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [title, setTitle] = useState("Founder");
  const [focus, setFocus] = useState("Product, frontend, fundraising");
  const [saved, setSaved] = useState(false);

  const onChange =
    (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      set(e.target.value);
      setSaved(false);
    };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <p className="kicker mb-2">Settings</p>
        <h1 className="text-[28px] font-medium tracking-tight text-ink-display">Profile</h1>
      </div>

      <SettingsTabs />

      <Card>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={name} size="lg" />
          <div>
            <p className="text-[15px] font-medium text-ink">{name}</p>
            <p className="text-[13px] text-ink-3">{email}</p>
          </div>
          <Badge tone="default" className="ml-auto capitalize">
            {user.role}
          </Badge>
        </div>

        <div className="flex flex-col gap-4">
          <Input label="Name" name="name" value={name} onChange={onChange(setName)} />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={onChange(setEmail)}
          />
        </div>
      </Card>

      <Card>
        <p className="kicker mb-1.5">What your agent knows about you</p>
        <p className="mb-4 text-[13px] leading-relaxed text-ink-3">
          Your role and focus areas tune what your agent captures — an engineer
          and a PM leave the same meeting with different notes.
        </p>
        <div className="flex flex-col gap-4">
          <Input label="Role title" name="title" value={title} onChange={onChange(setTitle)} />
          <Input
            label="Focus areas"
            name="focus"
            value={focus}
            onChange={onChange(setFocus)}
            placeholder="e.g. Billing, infrastructure, hiring"
          />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={() => setSaved(true)}>
          Save changes
        </Button>
        {saved && <span className="text-[13px] text-ink-3">Saved.</span>}
      </div>
    </div>
  );
}
