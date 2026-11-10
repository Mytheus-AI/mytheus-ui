"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BellSlash, CheckCircle, UserCircle } from "@phosphor-icons/react";
import { renameWorkspace } from "@/app/actions/workspace";
import { useOrgContext } from "@/lib/org-context";
import { Button } from "@/components/ui/Button";
import { FormFooter, SectionCard, SettingsRow, TextInput, focusPill } from "./primitives";

const textLink =
  "inline-flex items-center gap-1.5 rounded-md text-[13px] font-semibold text-signal-deep transition-colors hover:underline hover:underline-offset-4 active:opacity-70 " +
  focusPill;

/* Workspace: the organization name (saved to the Clerk organization by `renameWorkspace`, admins
   only), where the plan lives, and a read-only privacy summary. Notification preferences have
   no service behind them yet, so the card says so instead of offering switches that save
   nothing. */
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
      <SectionCard title="Organization" description="Shown in the sidebar and to your teammates.">
        <SettingsRow
          label="Organization name"
          htmlFor="orgName"
          help={canRename ? undefined : "Only workspace admins can rename the workspace."}
        >
          <TextInput
            id="orgName"
            name="orgName"
            value={orgName}
            readOnly={!canRename}
            aria-readonly={!canRename}
            maxLength={100}
            onChange={(e) => {
              setOrgName(e.target.value);
              setState("idle");
              setError(null);
            }}
          />
        </SettingsRow>
        <SettingsRow label="Plan" help="The plan, what it includes and usage live under Billing.">
          <Link href="/billing" className={textLink}>
            See plan and billing
            <ArrowRight size={14} weight="bold" aria-hidden="true" />
          </Link>
        </SettingsRow>
        {canRename ? (
          <FormFooter>
            <Button
              variant="secondary"
              disabled={!dirty || state === "saving"}
              className={`active:opacity-80 ${focusPill}`}
              onClick={() => void save()}
            >
              {state === "saving" ? "Saving..." : "Save changes"}
            </Button>
            <span role="status" className={`text-[13px] ${error ? "text-priority-high" : "text-ink-3"}`}>
              {error ?? (state === "saved" ? "Saved." : "")}
            </span>
          </FormFooter>
        ) : null}
      </SectionCard>

      <SectionCard title="Notifications" description="Which updates reach you, and where.">
        <div className="flex items-start gap-3.5 px-4 py-4 sm:px-[22px] sm:py-[18px]">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-bg-2 text-ink-2">
            <BellSlash size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-ink">Not available yet</p>
            <p className="mt-0.5 max-w-[60ch] text-[12.5px] text-ink-3">
              Mytheus does not send meeting summaries, task alerts or digests yet. Your preferences will be set here once
              notification delivery is live.
            </p>
          </div>
        </div>
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
