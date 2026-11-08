"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
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
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Email addresses</span>
            <textarea
              id="invite-emails"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="samar@example.com, yash@example.com"
              className="w-full resize-none rounded-md border border-line bg-surface px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus-visible:border-signal"
              autoFocus
            />
          </label>
          <label className="block" htmlFor="invite-role">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Access</span>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full rounded-md border border-line bg-surface px-4 py-2.5 text-[14px] text-ink focus-visible:border-signal"
            >
              <option value="org:member">Member: joins meetings and uses the workspace</option>
              <option value="org:admin">Admin: can also invite people and manage the workspace</option>
            </select>
          </label>
          <p className="text-[12.5px] text-ink-3">
            Each person gets an email from Clerk. Once they accept, they can be invited to meetings here.
          </p>
          {sent.length > 0 && (
            <p className="text-[13px] text-ink-2" role="status">
              Invitation sent to {sent.join(", ")}.
            </p>
          )}
          {error && (
            <p className="text-[13px] text-[#b3432f]" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              {sent.length > 0 ? "Done" : "Cancel"}
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send invitations"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
