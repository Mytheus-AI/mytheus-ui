"use client";

import { useState } from "react";
import Link from "next/link";
import { useOrgContext } from "@/lib/org-context";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const planLabel: Record<string, string> = {
  starter: "Starter plan",
  pro: "Pro plan",
  enterprise: "Enterprise plan",
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors duration-200 ${
        checked ? "bg-signal" : "bg-bg-3"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[4px]"
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { org, user } = useOrgContext();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [profileSaved, setProfileSaved] = useState(false);

  const [orgName, setOrgName] = useState(org.name);
  const [orgSaved, setOrgSaved] = useState(false);

  const [emailSummaries, setEmailSummaries] = useState(true);
  const [newActionItems, setNewActionItems] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <p className="kicker mb-2">Settings</p>
        <h1 className="text-[28px] font-medium tracking-tight text-ink-display">
          Account &amp; workspace
        </h1>
      </div>

      {/* Profile */}
      <Card>
        <div className="mb-5 flex items-center gap-4">
          <Avatar name={user.name} size="lg" />
          <div>
            <p className="text-[15px] font-medium text-ink">{user.name}</p>
            <p className="text-[13px] text-ink-3">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setProfileSaved(false);
            }}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setProfileSaved(false);
            }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setProfileSaved(true)}
          >
            Save changes
          </Button>
          {profileSaved ? (
            <span className="text-[13px] text-ink-3">Saved.</span>
          ) : null}
        </div>
      </Card>

      {/* Organization */}
      <Card>
        <p className="kicker mb-4">Organization</p>

        <div className="flex flex-col gap-4">
          <Input
            label="Organization name"
            name="orgName"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setOrgSaved(false);
            }}
          />

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-medium text-ink-2">Current plan</span>
            <Badge tone="success">{planLabel[org.plan] ?? org.plan}</Badge>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <Button variant="primary" onClick={() => setOrgSaved(true)}>
            Save changes
          </Button>
          {orgSaved ? <span className="text-[13px] text-ink-3">Saved.</span> : null}
          <Link href="/billing" className="link-underline text-[13px] font-medium text-ink-2">
            Change plan or billing details
          </Link>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <p className="kicker mb-4">Notifications</p>

        <div className="flex flex-col divide-y divide-line">
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-[14px] text-ink">Email me meeting summaries</span>
            <Toggle
              label="Email me meeting summaries"
              checked={emailSummaries}
              onChange={setEmailSummaries}
            />
          </div>
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-[14px] text-ink">Notify me of new action items</span>
            <Toggle
              label="Notify me of new action items"
              checked={newActionItems}
              onChange={setNewActionItems}
            />
          </div>
          <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-[14px] text-ink">Weekly digest</span>
            <Toggle
              label="Weekly digest"
              checked={weeklyDigest}
              onChange={setWeeklyDigest}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
