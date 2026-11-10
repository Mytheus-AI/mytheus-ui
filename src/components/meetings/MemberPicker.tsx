"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, MagnifyingGlass } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";

/* Pick workspace members to invite. Shared by the New meeting dialog and the meeting page's
   Invite dialog. Members come from the server already resolved (internal ids, Clerk names). With
   no one else in the workspace, an admin gets the way to invite people (Workspace, Members); a
   member, who cannot open that console, is told who can. */

export type PickableMember = { id: string; name: string; email: string };

export function MemberPicker({
  members,
  selected,
  onChange,
  emptyHint,
}: {
  /** null: the member list could not be loaded. */
  members: PickableMember[] | null;
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyHint?: string;
}) {
  const { user } = useOrgContext();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!members) return [];
    return needle
      ? members.filter((m) => m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle))
      : members;
  }, [members, q]);

  if (members === null) {
    return <p className="mh-pick-note">Members couldn&rsquo;t be loaded. You can invite people after creating it.</p>;
  }
  if (members.length === 0) {
    return (
      <p className="mh-pick-note">
        {emptyHint ?? "No one else is in this workspace yet."}{" "}
        {user.role === "admin" ? (
          <Link href="/workspace/members" className="mh-pick-link">
            Invite people to the workspace
          </Link>
        ) : (
          "A workspace admin can invite people."
        )}
      </p>
    );
  }

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div className="mh-pick">
      {members.length > 6 && (
        <label className="mh-pick-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
          />
        </label>
      )}
      <ul className="mh-pick-list">
        {shown.map((m) => {
          const on = selected.includes(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                className={`mh-pick-row tap${on ? " is-on" : ""}`}
                onClick={() => toggle(m.id)}
              >
                <span className="mh-pick-box" aria-hidden="true">
                  {on && <Check size={13} weight="bold" />}
                </span>
                <span className="mh-pick-who">
                  <strong>{m.name}</strong>
                  <small>{m.email}</small>
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
