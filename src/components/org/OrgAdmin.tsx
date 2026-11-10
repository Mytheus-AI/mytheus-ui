"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, MagnifyingGlass, PencilSimple, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createDepartment, createTeam, updateTeamMembers } from "@/app/actions/org";
import { inputClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifySuccess } from "@/lib/toast";

/* Admin controls on People (the org chart): new department, new team, edit a team's people. Rendered only
   for workspace owners and admins; core-api enforces the same rule on every write. People come
   from the server already resolved (`listMembers()`: internal ids, Clerk names). */

export type PickPerson = { id: string; name: string; email: string };
export type PickDepartment = { id: string; name: string };

const NONE = "none";

function ErrorLine({ message }: { message: string | null }) {
  return message ? <Note tone="error">{message}</Note> : null;
}

/** Visible label above a themed Select (the Select names itself with `label`). */
function FieldLabel({ children }: { children: string }) {
  return (
    <span className="mb-1.5 block text-[14px] font-semibold text-ink" aria-hidden="true">
      {children}
    </span>
  );
}

function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex flex-wrap justify-end gap-2 border-t border-line pt-4">{children}</div>;
}

export function NewDepartmentButton({ departments }: { departments: PickDepartment[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>(NONE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createDepartment({ name, parentId: parent === NONE ? null : parent });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setOpen(false);
    router.refresh();
    notifySuccess("Department created", { description: name.trim() });
  };

  return (
    <>
      <Button
        variant="outline"
       
        onClick={() => {
          setName("");
          setParent(NONE);
          setError(null);
          setOpen(true);
        }}
      >
        <Plus size={16} weight="bold" aria-hidden />
        New department
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="New department">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Input
            id="dept-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Engineering"
            maxLength={200}
            className={inputClass}
            autoFocus
          />
          {departments.length > 0 && (
            <div>
              <FieldLabel>Part of</FieldLabel>
              <Select
                label="Parent department"
                value={parent}
                onChange={setParent}
                className="w-full"
                options={[{ value: NONE, label: "Nothing, it's top level" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              />
            </div>
          )}
          <ErrorLine message={error} />
          <ModalActions>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating department" : "Create department"}
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}

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
    return needle
      ? people.filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle))
      : people;
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
      <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-ctl border border-line">
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
          <li className="px-3 py-3 text-[14px] text-ink-3">
            {people.length === 0 ? "No one is in this workspace yet." : `No one matches "${q.trim()}".`}
          </li>
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
}: {
  departments: PickDepartment[];
  /** null: the member list could not be loaded. */
  people: PickPerson[] | null;
  defaultDepartmentId?: string | null;
  variant?: "primary" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dept, setDept] = useState<string>(NONE);
  const [selected, setSelected] = useState<string[]>([]);
  const [lead, setLead] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await createTeam({ name, departmentId: dept === NONE ? null : dept, memberIds: selected, leadId: lead });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    router.refresh();
    notifySuccess("Team created", { description: name.trim() });
    if (res.warning) return setError(res.warning);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant={variant}
       
        onClick={() => {
          setName("");
          setDept(defaultDepartmentId ?? NONE);
          setSelected([]);
          setLead(null);
          setError(null);
          setOpen(true);
        }}
      >
        <Plus size={16} weight="bold" aria-hidden />
        New team
      </Button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title="New team">
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Input
            id="team-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Platform"
            maxLength={200}
            className={inputClass}
            autoFocus
          />
          {departments.length > 0 && (
            <div>
              <FieldLabel>Department</FieldLabel>
              <Select
                label="Department"
                value={dept}
                onChange={setDept}
                className="w-full"
                options={[{ value: NONE, label: "No department" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
              />
            </div>
          )}
          <div>
            <span className="mb-1.5 block text-[14px] font-semibold text-ink">People</span>
            {people === null ? (
              <Note tone="warning">Members could not be loaded. You can add people after creating the team.</Note>
            ) : (
              <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
            )}
          </div>
          <ErrorLine message={error} />
          <ModalActions>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              {error && !busy ? "Close" : "Cancel"}
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating team" : "Create team"}
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}

export function EditTeamButton({
  team,
  people,
}: {
  team: { id: string; name: string; memberIds: string[]; leadId: string | null };
  people: PickPerson[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(team.memberIds);
  const [lead, setLead] = useState<string | null>(team.leadId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await updateTeamMembers({ teamId: team.id, memberIds: selected, leadId: lead });
    setBusy(false);
    router.refresh();
    if (!res.ok) return setError(res.message);
    setOpen(false);
    notifySuccess("People saved", { description: team.name });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelected(team.memberIds);
          setLead(team.leadId);
          setError(null);
          setOpen(true);
        }}
        aria-label={`Edit people on ${team.name}`}
        title={`Edit people on ${team.name}`}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
      >
        <PencilSimple size={16} aria-hidden />
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={`People on ${team.name}`}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
          <ErrorLine message={error} />
          <ModalActions>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Saving people" : "Save people"}
            </Button>
          </ModalActions>
        </form>
      </Modal>
    </>
  );
}
