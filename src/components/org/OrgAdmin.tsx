"use client";

import { useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowsLeftRight, Check, MagnifyingGlass, PencilSimple, Plus, TextAlignLeft, Trash, TreeStructure } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import {
  createDepartment,
  createTeam,
  deleteDepartment,
  deleteTeam,
  updateDepartment,
  updateTeam,
  type OrgActionResult,
} from "@/app/actions/org";
import { DESCRIPTION_MAX, descendantsOf, plural } from "@/lib/org-chart";
import { notifyError, notifySuccess } from "@/lib/toast";
import { ActionMenu } from "./ActionMenu";

/* Admin controls on People (the org chart): create, rename, describe, move and delete departments
   and teams. Rendered only for workspace owners and admins; core-api enforces the same rule on
   every write, and a refusal (403) is shown as a message rather than trusted away. People come
   from the server already resolved (`listMembers()`: internal ids, Clerk names).

   Every create and edit asks what the unit does: agents read it (through the company brain) to
   tune each person's notes to their role and to notice when the team that owns a topic is missing
   from a meeting, so the helper copy says so and the placeholders show a useful answer. */

export type PickPerson = { id: string; name: string; email: string };
/** A department as the pickers need it; `parentId` lets "move under" leave out its own subtree. */
export type PickDepartment = { id: string; name: string; parentId?: string | null };

const NONE = "none";

export const DEPARTMENT_EXAMPLE =
  "Builds and runs the product: the web app, the agents and the infrastructure under them. Owns uptime, security reviews and the release calendar.";
export const TEAM_EXAMPLE =
  "Owns CI, deploys and the production database, and is on call for incidents. Bring us in before changing infrastructure, data retention or anything that touches uptime.";

function ErrorLine({ message }: { message: string | null }) {
  return message ? <Note tone="error">{message}</Note> : null;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-line pt-4">{children}</div>;
}

function Label({ htmlFor, id, children }: { htmlFor?: string; id?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} id={id} className="mb-1.5 block text-[14px] font-semibold text-ink">
      {children}
    </label>
  );
}

function NameField({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <Label htmlFor={id}>Name</Label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={200}
        autoComplete="off"
        className={fieldClass}
      />
    </div>
  );
}

/** "What does it do?" with the agents' reason, an example placeholder and a live count. */
export function DescriptionField({
  id,
  value,
  onChange,
  kind,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  kind: "department" | "team";
}) {
  const hint = `${id}-hint`;
  const over = value.trim().length > DESCRIPTION_MAX;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>What does it do?</Label>
        <CharCount n={value.trim().length} max={DESCRIPTION_MAX} />
      </div>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={kind === "department" ? DEPARTMENT_EXAMPLE : TEAM_EXAMPLE}
        aria-describedby={hint}
        aria-invalid={over || undefined}
        className={`${textareaClass} min-h-[112px] leading-relaxed`}
      />
      <FieldMsg
        id={hint}
        error={over ? `Keep it under ${DESCRIPTION_MAX} characters.` : null}
        hint={`Its purpose and what it is responsible for. Agents read this to tune notes to each person's role and to suggest stakeholders who are missing from a meeting.`}
      />
    </div>
  );
}

function DepartmentPicker({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: DropdownOption<string>[];
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Dropdown id={id} label={label} value={value} onChange={onChange} options={options} size="lg" className="w-full" />
    </div>
  );
}

const departmentOptions = (departments: PickDepartment[], noneLabel: string): DropdownOption<string>[] => [
  { value: NONE, label: noneLabel },
  ...departments.map((d) => ({ value: d.id, label: d.name })),
];

/** Run a write, then refresh, toast and close; a failure stays in the dialog. */
function useWrite(onDone: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (write: () => Promise<OrgActionResult>, success: string, detail?: string) => {
    setBusy(true);
    setError(null);
    let res: OrgActionResult;
    try {
      res = await write();
    } catch {
      res = { ok: false, message: "That didn't go through. Check your connection and try again." };
    }
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    router.refresh();
    notifySuccess(success, { description: detail });
    if (res.warning) {
      setError(res.warning);
      return false;
    }
    onDone();
    return true;
  };
  return { busy, error, setError, run };
}

/* --- New department ------------------------------------------------------------------------ */

export function NewDepartmentButton({
  departments,
  variant = "outline",
}: {
  departments: PickDepartment[];
  variant?: "primary" | "outline";
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState<string>(NONE);
  const { busy, error, setError, run } = useWrite(() => setOpen(false));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () => createDepartment({ name, description, parentId: parent === NONE ? null : parent }),
      "Department created",
      name.trim(),
    );
  };

  return (
    <>
      <Button
        variant={variant}
        onClick={() => {
          setName("");
          setDescription("");
          setParent(NONE);
          setError(null);
          setOpen(true);
        }}
      >
        <Plus size={16} weight="bold" aria-hidden />
        New department
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        title="New department"
        description="A group of teams, like Engineering or Revenue."
      >
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <NameField id={`${uid}-name`} value={name} onChange={setName} placeholder="Engineering" />
          <DescriptionField id={`${uid}-desc`} value={description} onChange={setDescription} kind="department" />
          {departments.length > 0 ? (
            <DepartmentPicker
              id={`${uid}-parent`}
              label="Part of"
              value={parent}
              onChange={setParent}
              options={departmentOptions(departments, "Nothing, it's top level")}
            />
          ) : null}
          <ErrorLine message={error} />
          <Actions>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim() || description.trim().length > DESCRIPTION_MAX}>
              {busy ? "Creating department" : "Create department"}
            </Button>
          </Actions>
        </form>
      </Dialog>
    </>
  );
}

/* --- New team -------------------------------------------------------------------------------- */

/** Pick who is on a team, and which one of them leads it. */
function PeoplePicker({
  people,
  selected,
  onSelected,
  lead,
  onLead,
}: {
  people: PickPerson[];
  selected: string[];
  onSelected: (ids: string[]) => void;
  lead: string | null;
  onLead: (id: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? people.filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle)) : people;
  }, [people, q]);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onSelected(selected.filter((s) => s !== id));
      if (lead === id) onLead(null);
    } else {
      onSelected([...selected, id]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {people.length > 6 && (
        <label className="flex h-11 items-center gap-2 rounded-ctl border border-line-2 bg-surface px-3.5 text-ink-3 transition-[border-color,box-shadow] duration-150 focus-within:border-signal focus-within:shadow-[0_0_0_4px_var(--signal-soft)]">
          <MagnifyingGlass size={16} aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3"
          />
        </label>
      )}
      <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-ctl border border-line">
        {shown.map((p) => {
          const on = selected.includes(p.id);
          const isLead = lead === p.id;
          return (
            <li key={p.id} className="flex items-center gap-2 pr-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(p.id)}
                className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-offset-[-2px]"
              >
                <span
                  aria-hidden
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${on ? "border-signal bg-signal text-surface" : "border-ink-3 bg-surface"}`}
                >
                  {on && <Check size={11} weight="bold" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-ink-3">{p.email}</span>
                </span>
              </button>
              {on && (
                <button
                  type="button"
                  aria-pressed={isLead}
                  aria-label={isLead ? `${p.name} leads this team` : `Make ${p.name} the lead`}
                  onClick={() => onLead(isLead ? null : p.id)}
                  className={`h-8 shrink-0 rounded-full px-3 text-[12.5px] font-semibold transition-colors duration-150 ${isLead ? "bg-signal-soft text-signal-ink" : "text-ink-3 ring-1 ring-inset ring-line-2 hover:bg-bg-2 hover:text-ink"}`}
                >
                  Lead
                </button>
              )}
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-3 py-3 text-[14px] text-ink-3">{people.length === 0 ? "No one is in this workspace yet." : `No one matches "${q.trim()}".`}</li>
        )}
      </ul>
      <p className="text-[14px] text-ink-3" aria-live="polite">
        {selected.length === 0 ? "No one picked yet. You can add people later." : `${selected.length} picked${lead ? ", lead set" : ""}.`}
      </p>
    </div>
  );
}

export function NewTeamButton({
  departments,
  people,
  defaultDepartmentId = null,
  variant = "primary",
  label = "New team",
}: {
  departments: PickDepartment[];
  /** null: the member list could not be loaded. */
  people: PickPerson[] | null;
  defaultDepartmentId?: string | null;
  variant?: "primary" | "outline" | "ghost";
  label?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dept, setDept] = useState<string>(NONE);
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState<string | null>(null);
  const { busy, error, setError, run } = useWrite(() => setOpen(false));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () => createTeam({ name, description, departmentId: dept === NONE ? null : dept, memberIds: selected, leadId: lead }),
      "Team created",
      name.trim(),
    );
  };

  return (
    <>
      <Button
        variant={variant}
        size={variant === "ghost" ? "sm" : "md"}
        onClick={() => {
          setName("");
          setDescription("");
          setDept(defaultDepartmentId ?? NONE);
          setSelected([]);
          setLead(null);
          setError(null);
          setOpen(true);
        }}
      >
        <Plus size={16} weight="bold" aria-hidden />
        {label}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} busy={busy} title="New team" description="The people who work together on one thing." size="lg">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <NameField id={`${uid}-name`} value={name} onChange={setName} placeholder="Platform" />
          <DescriptionField id={`${uid}-desc`} value={description} onChange={setDescription} kind="team" />
          {departments.length > 0 ? (
            <DepartmentPicker id={`${uid}-dept`} label="Department" value={dept} onChange={setDept} options={departmentOptions(departments, "No department")} />
          ) : null}
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold text-ink">People</span>
            {people === null ? (
              <Note tone="warning">Members could not be loaded. You can add people after creating the team.</Note>
            ) : (
              <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
            )}
          </div>
          <ErrorLine message={error} />
          <Actions>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              {error && !busy ? "Close" : "Cancel"}
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim() || description.trim().length > DESCRIPTION_MAX}>
              {busy ? "Creating team" : "Create team"}
            </Button>
          </Actions>
        </form>
      </Dialog>
    </>
  );
}

/* --- Editing a department ---------------------------------------------------------------------- */

export type DepartmentRef = { id: string; name: string; description: string | null; parentId: string | null; teamCount: number };

type DeptMode = "rename" | "describe" | "move" | "delete" | null;

export function DepartmentMenu({
  department,
  departments,
  people,
}: {
  department: DepartmentRef;
  /** every live department, for "move under" */
  departments: PickDepartment[];
  people: PickPerson[] | null;
}) {
  const uid = useId();
  const [mode, setMode] = useState<DeptMode>(null);
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description ?? "");
  const [parent, setParent] = useState<string>(department.parentId ?? NONE);
  const [addingTeam, setAddingTeam] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const close = () => setMode(null);
  const { busy, error, setError, run } = useWrite(close);

  const openAs = (m: Exclude<DeptMode, null>) => {
    setName(department.name);
    setDescription(department.description ?? "");
    setParent(department.parentId ?? NONE);
    setError(null);
    setMode(m);
  };

  const below = descendantsOf(
    departments.map((d) => ({ id: d.id, parent_id: d.parentId ?? null })),
    department.id,
  );
  const parents = departments.filter((d) => d.id !== department.id && !below.has(d.id));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "rename") void run(() => updateDepartment({ departmentId: department.id, name }), "Department renamed", name.trim());
    if (mode === "describe")
      void run(() => updateDepartment({ departmentId: department.id, description }), "Description saved", department.name);
    if (mode === "move")
      void run(
        () => updateDepartment({ departmentId: department.id, parentId: parent === NONE ? null : parent }),
        "Department moved",
        parent === NONE ? `${department.name} is now top level` : `${department.name} is now part of ${parents.find((p) => p.id === parent)?.name ?? "another department"}`,
      );
  };

  const remove = () =>
    void run(
      () => deleteDepartment({ departmentId: department.id }),
      "Department deleted",
      department.teamCount > 0 ? `${plural(department.teamCount, "team", "teams")} moved to No department` : department.name,
    );

  return (
    <>
      <ActionMenu
        label={`Edit ${department.name}`}
        items={[
          { label: "Rename", icon: <PencilSimple size={18} />, onSelect: () => openAs("rename") },
          { label: department.description ? "Edit description" : "Add description", icon: <TextAlignLeft size={18} />, onSelect: () => openAs("describe") },
          { label: "Move under another department", icon: <TreeStructure size={18} />, onSelect: () => openAs("move") },
          { label: "Add a team here", icon: <Plus size={18} />, onSelect: () => setAddingTeam(true) },
          { label: "Delete department", icon: <Trash size={18} />, tone: "danger", onSelect: () => openAs("delete") },
        ]}
      />
      {addingTeam ? (
        <AddTeamDialog departmentId={department.id} departments={departments} people={people} onClose={() => setAddingTeam(false)} />
      ) : null}

      <Dialog
        open={mode === "rename" || mode === "describe" || mode === "move"}
        onClose={close}
        busy={busy}
        title={mode === "rename" ? "Rename department" : mode === "move" ? `Move ${department.name}` : `What ${department.name} does`}
        description={mode === "move" ? "Its teams and the departments inside it move with it." : undefined}
      >
        <form onSubmit={save} className="flex flex-col gap-4" noValidate>
          {mode === "rename" ? <NameField id={`${uid}-name`} value={name} onChange={setName} placeholder="Engineering" /> : null}
          {mode === "describe" ? <DescriptionField id={`${uid}-desc`} value={description} onChange={setDescription} kind="department" /> : null}
          {mode === "move" ? (
            <DepartmentPicker id={`${uid}-parent`} label="Part of" value={parent} onChange={setParent} options={departmentOptions(parents, "Nothing, it's top level")} />
          ) : null}
          <ErrorLine message={error} />
          <Actions>
            <Button variant="outline" type="button" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={busy || (mode === "rename" && !name.trim()) || (mode === "describe" && description.trim().length > DESCRIPTION_MAX)}
            >
              {busy ? "Saving" : mode === "move" ? "Move department" : mode === "rename" ? "Save name" : "Save description"}
            </Button>
          </Actions>
        </form>
      </Dialog>

      <Dialog
        open={mode === "delete"}
        onClose={close}
        busy={busy}
        tone="danger"
        initialFocus={keep}
        title={`Delete ${department.name}?`}
        description={
          department.teamCount > 0
            ? `Its ${plural(department.teamCount, "team moves", "teams move")} to No department, with everyone on them. No team and no person is deleted.`
            : "It has no teams. No person is affected."
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-relaxed text-ink-3">Departments inside it move up one level. Agents stop seeing its description.</p>
          <ErrorLine message={error} />
          <Actions>
            <Button ref={keep} variant="outline" type="button" onClick={close} disabled={busy}>
              Keep department
            </Button>
            <Button variant="danger" type="button" onClick={remove} disabled={busy}>
              {busy ? "Deleting department" : "Delete department"}
            </Button>
          </Actions>
        </div>
      </Dialog>
    </>
  );
}

/** "Add a team here" from a department's menu: the New team flow with the department chosen. */
function AddTeamDialog({
  departmentId,
  departments,
  people,
  onClose,
}: {
  departmentId: string;
  departments: PickDepartment[];
  people: PickPerson[] | null;
  onClose: () => void;
}) {
  const uid = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dept, setDept] = useState<string>(departmentId);
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState<string | null>(null);
  const { busy, error, run } = useWrite(onClose);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(
      () => createTeam({ name, description, departmentId: dept === NONE ? null : dept, memberIds: selected, leadId: lead }),
      "Team created",
      name.trim(),
    );
  };
  return (
    <Dialog open onClose={onClose} busy={busy} title="New team" description="The people who work together on one thing." size="lg">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <NameField id={`${uid}-name`} value={name} onChange={setName} placeholder="Platform" />
        <DescriptionField id={`${uid}-desc`} value={description} onChange={setDescription} kind="team" />
        <DepartmentPicker id={`${uid}-dept`} label="Department" value={dept} onChange={setDept} options={departmentOptions(departments, "No department")} />
        <div>
          <span className="mb-1.5 block text-[14px] font-semibold text-ink">People</span>
          {people === null ? (
            <Note tone="warning">Members could not be loaded. You can add people after creating the team.</Note>
          ) : (
            <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
          )}
        </div>
        <ErrorLine message={error} />
        <Actions>
          <Button variant="outline" type="button" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={busy || !name.trim() || description.trim().length > DESCRIPTION_MAX}>
            {busy ? "Creating team" : "Create team"}
          </Button>
        </Actions>
      </form>
    </Dialog>
  );
}

/* --- Editing a team ---------------------------------------------------------------------------- */

export type TeamRef = { id: string; name: string; description: string | null; departmentId: string | null; memberCount: number };

type TeamMode = "edit" | "move" | "delete" | null;

/** The team card's menu. `onDescribe` lets the card's own "Add what this team does" open the editor. */
export function useTeamEditor(team: TeamRef, departments: PickDepartment[]) {
  const uid = useId();
  const [mode, setMode] = useState<TeamMode>(null);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description ?? "");
  const [dept, setDept] = useState<string>(team.departmentId ?? NONE);
  const keep = useRef<HTMLButtonElement>(null);
  const close = () => setMode(null);
  const { busy, error, setError, run } = useWrite(close);

  const openAs = (m: Exclude<TeamMode, null>) => {
    setName(team.name);
    setDescription(team.description ?? "");
    setDept(team.departmentId ?? NONE);
    setError(null);
    setMode(m);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "edit") void run(() => updateTeam({ teamId: team.id, name, description }), "Team saved", name.trim());
    if (mode === "move") {
      const to = departments.find((d) => d.id === dept)?.name ?? "No department";
      void run(() => updateTeam({ teamId: team.id, departmentId: dept === NONE ? null : dept }), "Team moved", `${team.name} is now in ${to}`);
    }
  };

  const remove = () =>
    void run(
      () => deleteTeam({ teamId: team.id }),
      "Team deleted",
      team.memberCount > 0 ? `${plural(team.memberCount, "person is", "people are")} no longer on ${team.name}` : team.name,
    );

  const menu = (
    <ActionMenu
      label={`Edit ${team.name}`}
      items={[
        { label: "Edit name and description", icon: <PencilSimple size={18} />, onSelect: () => openAs("edit") },
        { label: "Move to another department", icon: <ArrowsLeftRight size={18} />, onSelect: () => openAs("move") },
        { label: "Delete team", icon: <Trash size={18} />, tone: "danger", onSelect: () => openAs("delete") },
      ]}
    />
  );

  const dialogs = (
    <>
      <Dialog
        open={mode === "edit" || mode === "move"}
        onClose={close}
        busy={busy}
        title={mode === "move" ? `Move ${team.name}` : `Edit ${team.name}`}
        description={mode === "move" ? "Everyone on the team moves with it." : undefined}
        size={mode === "edit" ? "lg" : "md"}
      >
        <form onSubmit={save} className="flex flex-col gap-4" noValidate>
          {mode === "edit" ? (
            <>
              <NameField id={`${uid}-name`} value={name} onChange={setName} placeholder="Platform" />
              <DescriptionField id={`${uid}-desc`} value={description} onChange={setDescription} kind="team" />
            </>
          ) : (
            <DepartmentPicker id={`${uid}-dept`} label="Department" value={dept} onChange={setDept} options={departmentOptions(departments, "No department")} />
          )}
          <ErrorLine message={error} />
          <Actions>
            <Button variant="outline" type="button" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy || (mode === "edit" && (!name.trim() || description.trim().length > DESCRIPTION_MAX))}>
              {busy ? "Saving" : mode === "move" ? "Move team" : "Save team"}
            </Button>
          </Actions>
        </form>
      </Dialog>
      <Dialog
        open={mode === "delete"}
        onClose={close}
        busy={busy}
        tone="danger"
        initialFocus={keep}
        title={`Delete ${team.name}?`}
        description={
          team.memberCount > 0
            ? `The ${plural(team.memberCount, "person", "people")} on it stay in the workspace and on any other teams; they are only taken off this one.`
            : "No one is on it."
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14px] leading-relaxed text-ink-3">Agents stop seeing this team and what it does. This can&apos;t be undone.</p>
          <ErrorLine message={error} />
          <Actions>
            <Button ref={keep} variant="outline" type="button" onClick={close} disabled={busy}>
              Keep team
            </Button>
            <Button variant="danger" type="button" onClick={remove} disabled={busy}>
              {busy ? "Deleting team" : "Delete team"}
            </Button>
          </Actions>
        </div>
      </Dialog>
    </>
  );

  return { menu, dialogs, describe: () => openAs("edit") };
}

/** A failed write outside a dialog (adding or removing one person) as a toast. */
export function reportFailure(res: OrgActionResult) {
  if (!res.ok) notifyError(res.message);
}
