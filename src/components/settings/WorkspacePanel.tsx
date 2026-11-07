"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, UserCircle } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FormFooter, InlineRow, SectionCard, SettingsRow, TextInput, focusPill } from "./primitives";
import { Toggle } from "./Toggle";

const planLabel: Record<string, string> = {
  starter: "Starter plan",
  pro: "Pro plan",
  enterprise: "Enterprise plan",
};

const textLink =
  "inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-signal-deep transition-colors hover:underline hover:underline-offset-4 active:opacity-70 " +
  focusPill;

/* Workspace: organization name and plan, notification switches, and a read-only privacy summary.
   Edits are local state only until the Server Action wires to the backend, as before. */
export function WorkspacePanel() {
  const { org } = useOrgContext();

  const [orgName, setOrgName] = useState(org.name);
  const [savedName, setSavedName] = useState(org.name);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = orgName !== savedName;

  const [emailSummaries, setEmailSummaries] = useState(true);
  const [newActionItems, setNewActionItems] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  return (
    <>
      <SectionCard title="Organization" description="Shown in the sidebar and to your teammates.">
        <SettingsRow label="Organization name" htmlFor="orgName">
          <TextInput
            id="orgName"
            name="orgName"
            value={orgName}
            onChange={(e) => {
              setOrgName(e.target.value);
              setJustSaved(false);
            }}
          />
        </SettingsRow>
        <SettingsRow label="Current plan" help="Seats, invoices and usage live under Billing.">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone="success">{planLabel[org.plan] ?? org.plan}</Badge>
            <Link href="/billing" className={textLink}>
              Change plan or billing details
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </SettingsRow>
        <FormFooter>
          <Button
            variant="secondary"
            disabled={!dirty}
            className={`active:opacity-80 ${focusPill}`}
            onClick={() => {
              setSavedName(orgName);
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

      <SectionCard title="Notifications" description="Choose which updates reach you.">
        <InlineRow label="Email me meeting summaries" labelId="n-summaries">
          <Toggle labelledBy="n-summaries" checked={emailSummaries} onChange={setEmailSummaries} />
        </InlineRow>
        <InlineRow label="Notify me of new action items" labelId="n-actions">
          <Toggle labelledBy="n-actions" checked={newActionItems} onChange={setNewActionItems} />
        </InlineRow>
        <InlineRow label="Weekly digest" labelId="n-digest">
          <Toggle labelledBy="n-digest" checked={weeklyDigest} onChange={setWeeklyDigest} />
        </InlineRow>
      </SectionCard>

      <SectionCard
        title="Privacy and data"
        description="How your agents handle what is said in meetings."
      >
        <div className="flex items-start gap-3.5 px-4 py-4 sm:px-[22px] sm:py-[18px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-bg-2 text-ink-2">
            <CheckCircle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Nothing is saved until you confirm it</p>
            <p className="mt-0.5 max-w-[60ch] text-[12.5px] text-ink-3">
              Agents propose decisions and action items. They are recorded, and sent to your tracker,
              only after you confirm them.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3.5 px-4 py-4 sm:px-[22px] sm:py-[18px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-bg-2 text-ink-2">
            <UserCircle size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Your agent works from your profile</p>
            <p className="mt-0.5 max-w-[60ch] text-[12.5px] text-ink-3">
              Role and focus areas tune what your agent captures for you.
            </p>
            <Link href="/settings/profile" className={`mt-2 ${textLink}`}>
              Review your profile
              <ArrowRight size={14} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
