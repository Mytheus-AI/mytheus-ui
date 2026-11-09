"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, MagnifyingGlass, PencilSimple, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createDepartment, createTeam, updateTeamMembers } from "@/app/actions/org";

/* Admin controls on the Org chart: new department, new team, edit a team's people. Rendered only
   for workspace owners and admins; core-api enforces the same rule on every write. People come
   from the server already resolved (`listMembers()`: internal ids, Clerk names). */

export type PickPerson = { id: string; name: string; email: string };
export type PickDepartment = { id: string; name: string };

const NONE = "none";

function ErrorLine({ message }: { message: string | null }) {
  return message ? (
    <p className="text-[13px] text-[#b3432f]" role="alert">
      {message}
    </p>
  ) : null;
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
        Department
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
            autoFocus
          />
          {departments.length > 0 && (
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Part of</span>
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
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create department"}
            </Button>
          </div>
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
        <label className="flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-ink-3 focus-within:border-signal">
          <MagnifyingGlass size={14} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people"
            aria-label="Search people"
            className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none"
          />
        </label>
      )}
      <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-md border border-line">
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
                className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-bg"
              >
                <span
                  aria-hidden
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-signal bg-signal text-white" : "border-line-2 bg-surface"}`}
                >
                  {on && <Check size={11} weight="bold" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{p.email}</span>
                </span>
              </button>
              {on && (
                <button
                  type="button"
                  aria-pressed={isLead}
                  aria-label={isLead ? `${p.name} leads this team` : `Make ${p.name} the lead`}
                  onClick={() => onLead(isLead ? null : p.id)}
                  className={`shrink-0 rounded-pill px-2.5 py-1 text-[12px] font-semibold transition-colors ${isLead ? "bg-signal text-white" : "text-ink-3 hover:bg-bg-2 hover:text-ink"}`}
                >
                  Lead
                </button>
              )}
            </li>
          );
        })}
        {shown.length === 0 && (
          <li className="px-3 py-3 text-[13px] text-ink-3">
            {people.length === 0 ? "No one is in this workspace yet." : `No one matches "${q.trim()}".`}
          </li>
        )}
      </ul>
      <p className="text-[12.5px] text-ink-3">
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
        Team
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
            autoFocus
          />
          {departments.length > 0 && (
            <div>
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Department</span>
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
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">People</span>
            {people === null ? (
              <p className="text-[13px] text-ink-3">Members couldn&rsquo;t be loaded. You can add people after creating the team.</p>
            ) : (
              <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
            )}
          </div>
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              {error && !busy ? "Close" : "Cancel"}
            </Button>
            <Button variant="primary" type="submit" disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Create team"}
            </Button>
          </div>
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
        className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
      >
        <PencilSimple size={16} aria-hidden />
      </button>
      <Modal open={open} onClose={() => !busy && setOpen(false)} title={`People on ${team.name}`}>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <PeoplePicker people={people} selected={selected} onSelected={setSelected} lead={lead} onLead={setLead} />
          <ErrorLine message={error} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
