"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameWorkspace } from "@/app/actions/workspace";
import { useOrgContext } from "@/lib/org-context";
import { Button } from "@/components/ui/Button";
import { CardFoot, SectionCard } from "@/components/ui/Card";
import { FieldRow, inputClass } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { notifyError, notifySuccess } from "@/lib/toast";

/* The workspace's name (saved to the Clerk organization by `renameWorkspace`). Shown in the
   sidebar, on invitations and to teammates. Lives in the Workspace console's Overview, which only
   admins reach. "Save name" answers with the "Name saved" toast, and Undo puts the old name back. */
export function OrgNameCard() {
  const { org } = useOrgContext();
  const router = useRouter();
  const [orgName, setOrgName] = useState(org.name);
  const [savedName, setSavedName] = useState(org.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = orgName.trim() !== savedName;

  const save = async (name: string, undoTo?: string) => {
    setSaving(true);
    setError(null);
    const result = await renameWorkspace(name);
    setSaving(false);
    if (result.ok) {
      const before = savedName;
      setSavedName(result.name);
      setOrgName(result.name);
      router.refresh();
      if (undoTo === undefined) notifySuccess("Name saved", { description: result.name, undo: () => void save(before, before) });
      else notifySuccess("Name restored", { description: result.name });
    } else {
      setError(result.message);
      notifyError(result.message);
    }
  };

  return (
    <SectionCard title="Workspace name" headingId="org-name-h" description="Shown in the sidebar, on invitations and to your teammates.">
      <FieldRow label="Name" htmlFor="orgName" help="Up to 100 characters.">
        <Input
          id="orgName"
          name="orgName"
          value={orgName}
          aria-invalid={error ? true : undefined}
          maxLength={100}
          className={inputClass}
          onChange={(e) => {
            setOrgName(e.target.value);
            setError(null);
          }}
        />
      </FieldRow>
      <CardFoot>
        <Button disabled={!dirty || saving} onClick={() => void save(orgName)}>
          {saving ? "Saving name" : "Save name"}
        </Button>
        {dirty ? <p className="text-[14px] text-ink-3">Unsaved changes</p> : null}
      </CardFoot>
    </SectionCard>
  );
}
