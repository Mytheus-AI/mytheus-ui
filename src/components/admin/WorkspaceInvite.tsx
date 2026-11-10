"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Note, focusPill } from "@/components/settings/primitives";
import { inviteToWorkspace } from "@/app/actions/workspace-invites";

/* "Invite people" on the workspace page. Clerk owns workspace membership, so the invitation is
   Clerk's: it emails the person a link. The link lands on the workspace chooser
   (`?switch=1`), which lists the invitation for them to accept; accepting makes them a member
   here too (the self-serve join path, backed by Clerk's membership webhook). Only a workspace
   admin may invite; the server action checks it against the verified session. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function WorkspaceInvite() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState<"org:member" | "org:admin">("org:member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]);

  const reset = () => {
    setEmails("");
    setRole("org:member");
    setError(null);
    setSent([]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const list = Array.from(
      new Set(
        emails
          .split(/[\s,;]+/)
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    );
    if (list.length === 0) return setError("Add at least one email address.");
    const bad = list.find((a) => !EMAIL.test(a));
    if (bad) return setError(`"${bad}" doesn't look like an email address.`);

    setBusy(true);
    setError(null);
    const result = await inviteToWorkspace(list, role);
    setBusy(false);
    setSent(result.sent);
    if (result.failed.length > 0) {
      setError(result.failed.map((f) => `${f.email}: ${f.message}`).join(" "));
    }
    if (result.sent.length > 0) router.refresh();
  };

  return (
    <>
      <Button
        variant="primary"
        className={focusPill}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <UserPlus size={17} weight="bold" aria-hidden />
        Invite people
      </Button>

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Invite people">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <label className="block" htmlFor="invite-emails">
            <span className="mb-1.5 block text-[14px] font-semibold text-ink">Email addresses</span>
            <span id="invite-emails-help" className="mb-2 block text-[13.5px] text-ink-3">
              Separate addresses with commas or new lines.
            </span>
            <textarea
              id="invite-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              aria-describedby="invite-emails-help"
              aria-invalid={error && sent.length === 0 ? true : undefined}
              placeholder="samar@example.com, yash@example.com"
              className="block w-full resize-none rounded-ctl border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-ink-4 hover:border-ink-4 focus-visible:!rounded-ctl focus-visible:border-signal focus-visible:shadow-[0_0_0_4px_var(--signal-soft)] focus-visible:outline-none"
              autoFocus
            />
          </label>
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold text-ink" aria-hidden="true">
              Access
            </span>
            <Select
              label="Access"
              value={role}
              onChange={setRole}
              className="w-full"
              options={[
                { value: "org:member", label: "Member" },
                { value: "org:admin", label: "Admin" },
              ]}
            />
            <p className="mt-1.5 text-[13.5px] text-ink-3">
              {role === "org:admin"
                ? "Admins can also invite people and manage the workspace."
                : "Members join meetings and use the workspace."}
            </p>
          </div>
          <p className="text-[13.5px] text-ink-3">
            Each person gets an email from Clerk. Once they accept, they can be invited to meetings here.
          </p>
          <div aria-live="polite">
            {sent.length > 0 ? <Note tone="success">Invitations sent to {sent.join(", ")}.</Note> : null}
          </div>
          {error ? <Note tone="error">{error}</Note> : null}
          <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" type="button" className={focusPill} onClick={() => setOpen(false)} disabled={busy}>
              {sent.length > 0 ? "Done" : "Cancel"}
            </Button>
            <Button variant="primary" type="submit" className={focusPill} disabled={busy}>
              {busy ? "Sending invitations" : "Send invitations"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
