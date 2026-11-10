"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell, CheckCircle, UserCircle } from "@phosphor-icons/react";
import { renameWorkspace } from "@/app/actions/workspace";
import { useOrgContext } from "@/lib/org-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormFooter, InfoRow, SaveStatus, SectionCard, SettingsRow, focusPill, inputClass } from "./primitives";

const textLink =
  "inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold text-signal underline-offset-4 transition-colors hover:text-signal-deep hover:underline " +
  focusPill;

/* Workspace: the organization name (saved to the Clerk organization by `renameWorkspace`, admins
   only), where the plan lives, where alerts are set, and a read-only privacy summary. */
export function WorkspacePanel() {
  const { org, user } = useOrgContext();
  const router = useRouter();
  const canRename = user.role === "admin";

  const [orgName, setOrgName] = useState(org.name);
  const [savedName, setSavedName] = useState(org.name);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const dirty = orgName.trim() !== savedName;

  const save = async () => {
    setState("saving");
    setError(null);
    const result = await renameWorkspace(orgName);
    if (result.ok) {
      setSavedName(result.name);
      setOrgName(result.name);
      setState("saved");
      router.refresh();
    } else {
      setState("idle");
      setError(result.message);
    }
  };

  return (
    <>
      <SectionCard title="Organization" description="Shown in the sidebar, on invites and to your teammates.">
        <SettingsRow
          label="Organization name"
          htmlFor="orgName"
          help={canRename ? "Up to 100 characters." : "Only workspace admins can rename the workspace."}
        >
          <Input
            id="orgName"
            name="orgName"
            value={orgName}
            readOnly={!canRename}
            aria-readonly={!canRename}
            aria-invalid={error ? true : undefined}
            maxLength={100}
            className={inputClass}
            onChange={(e) => {
              setOrgName(e.target.value);
              setState("idle");
              setError(null);
            }}
          />
        </SettingsRow>
        <SettingsRow label="Plan" help="What the plan includes, usage this period and invoices.">
          <Link href="/billing" className={textLink}>
            See plan and billing
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </SettingsRow>
        {canRename ? (
          <FormFooter>
            <Button
              disabled={!dirty || state === "saving"}
              className={focusPill}
              onClick={() => void save()}
            >
              {state === "saving" ? "Saving name" : "Save name"}
            </Button>
            <SaveStatus tone={error ? "error" : state === "saved" ? "ok" : undefined}>
              {error ?? (state === "saved" ? "Name saved." : "")}
            </SaveStatus>
          </FormFooter>
        ) : null}
      </SectionCard>

      <SectionCard title="Notifications" description="Which updates reach you, and where.">
        <InfoRow icon={<Bell size={20} />} title="Alerts are set per person">
          <p>
            Each person chooses how their agent&rsquo;s alerts reach them, in the meeting or by email. Meeting
            summaries, task reminders and digests are not sent yet.
          </p>
          <Link href="/settings/profile" className={`mt-1 ${textLink}`}>
            Set your alerts
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </InfoRow>
      </SectionCard>

      <SectionCard title="Privacy and data" description="How your agents handle what is said in meetings.">
        <InfoRow icon={<CheckCircle size={20} />} title="Nothing is saved until you confirm it">
          <p>
            Agents propose decisions and action items. They are recorded, and sent to your tracker, only after you
            confirm them.
          </p>
        </InfoRow>
        <InfoRow icon={<UserCircle size={20} />} title="Your agent works from your profile">
          <p>Role and focus areas tune what your agent captures for you.</p>
          <Link href="/settings/profile" className={`mt-1 ${textLink}`}>
            Review your profile
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </InfoRow>
      </SectionCard>
    </>
  );
}
