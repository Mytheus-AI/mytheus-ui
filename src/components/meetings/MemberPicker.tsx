"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { Check, MagnifyingGlass, UserPlus, WarningCircle, X } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { useOrgContext } from "@/lib/org-context";

/* Pick workspace members to invite. Shared by the New meeting dialog and the meeting page's
   Invite dialog. Members come from the server already resolved (internal ids, Clerk names).
   Inviting people to the workspace is an admin task (Workspace > Members), so only an admin is
   offered that link; a member is told who can do it instead of being sent to a page they
   cannot open.

   Each person shows their face (the same doodle every surface draws for them); the people picked
   so far sit above the list as chips that remove them; search appears once there are more than
   four. */

export type PickableMember = { id: string; name: string; email: string };

export function MemberPicker({
  members,
  selected,
  onChange,
  emptyHint,
  disabled = false,
}: {
  /** null: the member list could not be loaded. */
  members: PickableMember[] | null;
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
  disabled?: boolean;
}) {
  const isAdmin = useOrgContext().user.role === "admin";
  const uid = useId();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!members) return [];
    return needle
      ? members.filter((m) => m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle))
      : members;
  }, [members, q]);

  if (members === null) {
    return (
      <p className="mh-pick-note is-error" role="status">
        <WarningCircle size={16} weight="fill" aria-hidden="true" />
        Members couldn&rsquo;t be loaded. You can invite people after creating it.
      </p>
    );
  }
  if (members.length === 0) {
    return (
      <p className="mh-pick-note is-empty">
        <UserPlus size={16} aria-hidden="true" />
        <span>
          {emptyHint ?? "No one else is in this workspace yet."}{" "}
          {isAdmin ? (
            <Link href="/workspace/members" className="mh-pick-link">
              Invite people to the workspace
            </Link>
          ) : (
            "A workspace admin can invite people."
          )}
        </span>
      </p>
    );
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  const chosen = members.filter((m) => selected.includes(m.id));

  return (
    <div className="mh-pick">
      {members.length > 4 && (
        <label className="mh-pick-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${members.length} people`}
            aria-label="Search people"
            aria-controls={`${uid}-list`}
            disabled={disabled}
          />
        </label>
      )}
      {chosen.length > 0 ? (
        <ul className="mh-pick-chips" aria-label="Invited">
          {chosen.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="mh-pick-chip tap"
                aria-label={`Remove ${m.name}`}
                disabled={disabled}
                onClick={() => toggle(m.id)}
              >
                <span aria-hidden="true">
                  <Avatar name={m.name} id={m.email} size="xs" />
                </span>
                {m.name.split(" ")[0]}
                <X size={12} weight="bold" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <ul className="mh-pick-list" id={`${uid}-list`} aria-label="Workspace members">
        {shown.map((m) => {
          const on = selected.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`mh-pick-row tap${on ? " is-on" : ""}`}
                disabled={disabled}
                onClick={() => toggle(m.id)}
              >
                <span className="mh-pick-face" aria-hidden="true">
                  <Avatar name={m.name} id={m.email} size="md" />
                </span>
                <span className="mh-pick-who">
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
                </span>
                <span className="mh-pick-box" aria-hidden="true">
                  {on && <Check size={13} weight="bold" />}
                </span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="mh-pick-note">No one matches &ldquo;{q.trim()}&rdquo;.</li>}
      </ul>
    </div>
  );
}
