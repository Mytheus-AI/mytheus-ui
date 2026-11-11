"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowsLeftRight, Crown, UserMinus } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { MemberPicker, type MemberOption } from "@/components/ui/MemberPicker";
import { Note } from "@/components/ui/Note";
import { addTeamMember, moveTeamMember, removeTeamMember, setTeamLead, type OrgActionResult } from "@/app/actions/org";
import { isLeadRole, plural, type OrgMember, type OrgTeam } from "@/lib/org-chart";
import { notifyError, notifySuccess } from "@/lib/toast";
import { ActionMenu } from "./ActionMenu";
import { DescriptionText } from "./DescriptionText";
import { useTeamEditor, type PickDepartment } from "./OrgAdmin";

/* One team on People: its name, head count and lead, what it does (clamped, with More), and the
   people on it. For admins: the team's menu (edit, move to a department, delete), a menu on each
   person (make lead, move to another team, remove) and "Add a person" from the shared
   MemberPicker. Everyone else sees the same card read-only. */

const LONG = 160; // a description longer than this is clamped to three lines with "More"

/** A membership label worth showing next to the email: anything other than the plain defaults. */
const roleLabel = (role: string | null) => {
  const r = role?.trim();
  return r && r.toLowerCase() !== "member" && !isLeadRole(r) ? r : null;
};

export type TeamCardProps = {
  team: OrgTeam;
  /** null: read-only (not an admin) */
  edit: {
    departments: PickDepartment[];
    /** every team in the workspace, for "move to another team" */
    teams: { id: string; name: string }[];
    /** null: the member list could not be loaded */
    members: MemberOption[] | null;
  } | null;
};

export function TeamCard({ team, edit }: TeamCardProps) {
  const uid = useId();
  const router = useRouter();
  const [moving, setMoving] = useState<OrgMember | null>(null);
  const [busy, setBusy] = useState(false);
  const lead = team.members.find((m) => m.lead);
  const editor = useTeamEditor(
    { id: team.id, name: team.name, description: team.description, departmentId: team.departmentId, memberCount: team.members.length },
    edit?.departments ?? [],
  );

  const write = async (action: () => Promise<OrgActionResult>, success: string, detail?: string) => {
    setBusy(true);
    let res: OrgActionResult;
    try {
      res = await action();
    } catch {
      res = { ok: false, message: "That didn't go through. Check your connection and try again." };
    }
    setBusy(false);
    if (!res.ok) {
      notifyError(res.message);
      return false;
    }
    router.refresh();
    notifySuccess(success, { description: detail });
    return true;
  };

  const onTeam = new Set(team.members.map((m) => m.id));
  const addable = edit?.members?.filter((m) => !onTeam.has(m.id)) ?? [];

  return (
    <article aria-labelledby={`${uid}-title`} className="flex min-w-0 flex-col rounded-card border border-line bg-surface shadow-warm-1">
      <header className="flex items-start gap-3 px-4 pb-3 pt-[18px] sm:px-[22px]">
        <div className="min-w-0 flex-1">
          <h3 id={`${uid}-title`} className="truncate text-[17px] font-semibold leading-snug text-ink">
            {team.name}
          </h3>
          <p className="mt-0.5 text-[14px] text-ink-3">
            {plural(team.members.length, "member", "members")}
            {lead ? `, led by ${lead.name}` : ""}
          </p>
        </div>
        {edit ? <div className="-mr-2 -mt-1.5">{editor.menu}</div> : null}
      </header>

      <div className="px-4 pb-4 sm:px-[22px]">
        {team.description ? (
          <DescriptionText text={team.description} label={team.name} limit={LONG} className="text-[15px] leading-relaxed text-ink-2" />
        ) : edit ? (
          <button
            type="button"
            onClick={editor.describe}
            className="w-full rounded-ctl border border-dashed border-line-2 px-3.5 py-3 text-left text-[14px] text-ink-3 transition-colors duration-150 hover:border-ink-4 hover:bg-surface-2 hover:text-ink-2"
          >
            <span className="font-semibold text-ink-2">Add what this team does.</span> Agents use it to tune notes to the people on it.
          </button>
        ) : (
          <p className="text-[14px] text-ink-3">No description yet.</p>
        )}
      </div>

      {team.members.length === 0 ? (
        <p className="border-t border-line px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No one on this team yet.</p>
      ) : (
        <ul className="divide-y divide-line border-t border-line" aria-label={`People on ${team.name}`}>
          {team.members.map((m) => {
            const label = roleLabel(m.role);
            const others = edit?.teams.filter((t) => t.id !== team.id) ?? [];
            return (
              <li key={m.id} className="flex items-center gap-1 pr-2 sm:pr-3">
                <Link
                  href={`/people/${m.id}`}
                  className="group flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-1 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-offset-[-2px] sm:pl-[22px]"
                >
                  <Avatar name={m.name} id={m.email} src={m.imageUrl ?? undefined} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-ink group-hover:underline group-hover:underline-offset-4">{m.name}</span>
                      {m.isYou ? <Chip className="shrink-0">You</Chip> : null}
                    </span>
                    <span className="block truncate text-[14px] text-ink-3">{m.email}</span>
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {label ? <Chip className="max-w-[8rem] truncate">{label}</Chip> : null}
                    {m.lead ? <Chip tone="accent">Lead</Chip> : null}
                  </span>
                </Link>
                {edit ? (
                  <ActionMenu
                    size="sm"
                    label={`Change ${m.name} on ${team.name}`}
                    items={[
                      m.lead
                        ? {
                            label: "Remove as lead",
                            icon: <Crown size={18} />,
                            disabled: busy,
                            onSelect: () => void write(() => setTeamLead({ teamId: team.id, userId: null }), "Lead removed", `${team.name} has no lead`),
                          }
                        : {
                            label: "Make lead",
                            icon: <Crown size={18} />,
                            disabled: busy,
                            onSelect: () => void write(() => setTeamLead({ teamId: team.id, userId: m.id }), "Lead set", `${m.name} leads ${team.name}`),
                          },
                      {
                        label: "Move to another team",
                        icon: <ArrowsLeftRight size={18} />,
                        disabled: busy || others.length === 0,
                        onSelect: () => setMoving(m),
                      },
                      {
                        label: `Remove from ${team.name}`,
                        icon: <UserMinus size={18} />,
                        tone: "danger",
                        disabled: busy,
                        onSelect: () =>
                          void write(() => removeTeamMember({ teamId: team.id, userId: m.id }), "Removed from team", `${m.name} is no longer on ${team.name}`),
                      },
                    ]}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {edit ? (
        <div className="mt-auto border-t border-line px-4 py-3 sm:px-[22px]">
          {edit.members === null ? (
            <Note tone="warning">Workspace members could not be loaded, so no one can be added right now.</Note>
          ) : addable.length === 0 ? (
            <p className="py-2 text-[14px] text-ink-3">Everyone in the workspace is on this team.</p>
          ) : (
            <MemberPicker
              id={`${uid}-add`}
              label={`Add a person to ${team.name}`}
              placeholder="Add a person"
              members={addable}
              value={null}
              size="sm"
              disabled={busy}
              onChange={(userId) => {
                const who = addable.find((p) => p.id === userId);
                if (userId) void write(() => addTeamMember({ teamId: team.id, userId }), "Added to team", who ? `${who.name} is on ${team.name}` : undefined);
              }}
            />
          )}
        </div>
      ) : null}

      {edit ? editor.dialogs : null}
      {edit && moving ? (
        <MoveMemberDialog
          person={moving}
          from={team}
          teams={edit.teams.filter((t) => t.id !== team.id)}
          onClose={() => setMoving(null)}
          onMove={async (toId) => {
            const to = edit.teams.find((t) => t.id === toId)?.name ?? "the other team";
            const ok = await write(
              () => moveTeamMember({ fromTeamId: team.id, toTeamId: toId, userId: moving.id }),
              "Moved to another team",
              `${moving.name} moved from ${team.name} to ${to}`,
            );
            if (ok) setMoving(null);
          }}
          busy={busy}
        />
      ) : null}
    </article>
  );
}

function MoveMemberDialog({
  person,
  from,
  teams,
  onClose,
  onMove,
  busy,
}: {
  person: OrgMember;
  from: OrgTeam;
  teams: { id: string; name: string }[];
  onClose: () => void;
  onMove: (teamId: string) => void;
  busy: boolean;
}) {
  const uid = useId();
  const [to, setTo] = useState<string | null>(teams[0]?.id ?? null);
  return (
    <Dialog
      open
      onClose={onClose}
      busy={busy}
      title={`Move ${person.name}`}
      description={`Off ${from.name} and onto another team, in one step.${person.lead ? " They join as a member, not the lead." : ""}`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (to) onMove(to);
        }}
      >
        <div>
          <label htmlFor={`${uid}-to`} className="mb-1.5 block text-[14px] font-semibold text-ink">
            New team
          </label>
          <Dropdown id={`${uid}-to`} label="New team" value={to} onChange={setTo} options={teams.map((t) => ({ value: t.id, label: t.name }))} size="lg" className="w-full" />
        </div>
        <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={busy || !to}>
            {busy ? "Moving" : `Move ${person.name.split(" ")[0]}`}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
