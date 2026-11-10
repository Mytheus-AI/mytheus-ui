"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { PencilSimple } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Note, fieldClass } from "@/components/settings/primitives";
import { createOwner, deleteOwner, updateOwner } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  validateOwner,
  type FieldErrors,
  type OwnerField,
  type TopicOwner,
} from "@/lib/api/org-brain-types";
import { memberMap, type MemberOption } from "./types";
import { FieldMsg, FlashLine, MemberPicker, PersonLine, RemoveButton, useFlash } from "./ui";

/* Who owns what (ADR-0039 A3): a topic and the one person who owns it. Agents use it to suggest
   who should take an action and who to ask. The list on the left (change an owner straight from
   the row); on the right the same thing by person, so gaps and overloads show. Optimistic with
   rollback. */

const L = BRAIN_LIMITS.owners;
const sortOwners = (list: TopicOwner[]) => [...list].sort((a, b) => a.topic.localeCompare(b.topic, undefined, { sensitivity: "base" }));
let tempSeq = 0;

export function OwnersEditor({
  initial,
  members,
  canEdit,
}: {
  initial: TopicOwner[];
  members: MemberOption[] | null;
  canEdit: boolean;
}) {
  const [owners, setOwners] = useState(() => sortOwners(initial));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors<OwnerField>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [flash, setFlash] = useFlash();
  const topicRef = useRef<HTMLInputElement>(null);
  const renameDone = useRef<string | null>(null);

  const people = useMemo(() => memberMap(members ?? []), [members]);
  const full = owners.length >= L.max;
  const editable = canEdit && !!members;

  const byPerson = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const o of owners) groups.set(o.owner_user_id, [...(groups.get(o.owner_user_id) ?? []), o.topic]);
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [owners]);

  const mark = (id: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const checked = validateOwner({ topic, owner_user_id: owner ?? "" }, owners);
    if (!checked.ok) {
      setErrors(checked.errors);
      if (checked.errors.topic) topicRef.current?.focus();
      return;
    }
    setErrors({});
    const tempId = `temp-${++tempSeq}`;
    setOwners((o) => sortOwners([...o, { id: tempId, ...checked.value, created_at: "" }]));
    mark(tempId, true);
    const before = { topic, owner };
    setTopic("");
    topicRef.current?.focus();
    const res = await createOwner(checked.value);
    mark(tempId, false);
    if (res.ok) {
      setOwners((o) => sortOwners(o.map((x) => (x.id === tempId ? res.data : x))));
      setFlash({ tone: "ok", text: `${res.data.topic} now has an owner.` });
    } else {
      setOwners((o) => o.filter((x) => x.id !== tempId));
      setTopic(before.topic);
      setOwner(before.owner);
      setErrors(res.fieldErrors ?? {});
      setFlash({ tone: "error", text: res.message });
    }
  };

  const change = async (row: TopicOwner, patch: Partial<Pick<TopicOwner, "topic" | "owner_user_id">>) => {
    const next = { ...row, ...patch };
    setOwners((o) => sortOwners(o.map((x) => (x.id === row.id ? next : x))));
    mark(row.id, true);
    const res = await updateOwner(row.id, { topic: next.topic, owner_user_id: next.owner_user_id });
    mark(row.id, false);
    if (res.ok) {
      setOwners((o) => sortOwners(o.map((x) => (x.id === row.id ? res.data : x))));
      const who = people.get(res.data.owner_user_id)?.name ?? "the new owner";
      setFlash({ tone: "ok", text: patch.topic ? `Renamed to ${res.data.topic}.` : `${res.data.topic} is now owned by ${who}.` });
    } else if (res.gone) {
      setOwners((o) => o.filter((x) => x.id !== row.id));
      setFlash({ tone: "error", text: res.message });
    } else {
      setOwners((o) => sortOwners(o.map((x) => (x.id === row.id ? row : x))));
      setFlash({ tone: "error", text: res.message });
    }
  };

  const rename = (row: TopicOwner) => {
    // Enter submits and the input's blur follows as it unmounts: act once.
    if (renameDone.current === row.id) return;
    const checked = validateOwner({ topic: renameText, owner_user_id: row.owner_user_id }, owners, row.id);
    if (!checked.ok) {
      setRenameError(checked.errors.topic ?? null);
      return;
    }
    renameDone.current = row.id;
    setRenaming(null);
    setRenameError(null);
    if (checked.value.topic !== row.topic) void change(row, { topic: checked.value.topic });
  };

  const remove = async (row: TopicOwner) => {
    setOwners((o) => o.filter((x) => x.id !== row.id));
    const res = await deleteOwner(row.id);
    if (res.ok) setFlash({ tone: "ok", text: `${row.topic} removed.` });
    else {
      setOwners((o) => sortOwners([...o, row]));
      setFlash({ tone: "error", text: res.message });
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
        {canEdit && members === null ? (
          <div className="px-4 pt-4 sm:px-[22px]">
            <Note tone="warning">The member list could not be loaded, so owners cannot be changed right now. Reload to try again.</Note>
          </div>
        ) : null}

        {editable ? (
          <form onSubmit={add} noValidate className="grid gap-3 border-b border-line px-4 py-4 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start">
            <div className="min-w-0">
              <label htmlFor="owner-topic" className="mb-1 block text-[13px] font-semibold text-ink-3">
                Topic
              </label>
              <input
                ref={topicRef}
                id="owner-topic"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (errors.topic) setErrors((x) => ({ ...x, topic: undefined }));
                }}
                placeholder="Pricing, hiring, the mobile app"
                autoComplete="off"
                disabled={full}
                aria-invalid={errors.topic ? true : undefined}
                aria-describedby={errors.topic ? "owner-topic-msg" : undefined}
                className={`${fieldClass} ${errors.topic ? "!border-priority-high" : ""}`}
              />
              <FieldMsg id="owner-topic-msg" error={errors.topic} />
            </div>
            <div className="min-w-0">
              <span id="owner-person-label" className="mb-1 block text-[13px] font-semibold text-ink-3">
                Owner
              </span>
              <MemberPicker
                id="owner-person"
                members={members ?? []}
                value={owner}
                onChange={(id) => {
                  setOwner(id);
                  if (errors.owner_user_id) setErrors((x) => ({ ...x, owner_user_id: undefined }));
                }}
                label="Owner"
                invalid={!!errors.owner_user_id}
                describedBy={errors.owner_user_id ? "owner-person-msg" : undefined}
                disabled={full}
              />
              <FieldMsg id="owner-person-msg" error={errors.owner_user_id} />
            </div>
            <div className="md:pt-[22px]">
              <Button type="submit" disabled={full} className="w-full focus-visible:!rounded-ctl md:w-auto">
                Add owner
              </Button>
            </div>
          </form>
        ) : null}

        {owners.length === 0 ? (
          <EmptyState
            className="!rounded-none !border-0 !bg-transparent"
            title="No owners named yet"
            description={
              canEdit
                ? "Name a topic and the person who owns it. Five is enough to start: the questions that come up most in your meetings."
                : "When an admin names who owns what, it appears here."
            }
          />
        ) : (
          <ul aria-label={`Topics and owners, ${owners.length}`} className="divide-y divide-line">
            {owners.map((o) => {
              const busy = pending.has(o.id);
              const person = people.get(o.owner_user_id);
              return (
                <li
                  key={o.id}
                  aria-busy={busy || undefined}
                  className={`grid gap-x-4 gap-y-2 px-4 py-3 transition-opacity duration-150 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center ${busy ? "opacity-60" : ""}`}
                >
                  {renaming === o.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        rename(o);
                      }}
                      className="min-w-0"
                    >
                      <label htmlFor={`rename-${o.id}`} className="sr-only">
                        Rename {o.topic}
                      </label>
                      <input
                        id={`rename-${o.id}`}
                        autoFocus
                        value={renameText}
                        onChange={(e) => {
                          setRenameText(e.target.value);
                          setRenameError(null);
                        }}
                        onBlur={() => rename(o)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            e.preventDefault();
                            renameDone.current = o.id;
                            setRenaming(null);
                            setRenameError(null);
                          }
                        }}
                        aria-invalid={renameError ? true : undefined}
                        aria-describedby={renameError ? `rename-${o.id}-msg` : undefined}
                        className={`${fieldClass} !h-10 ${renameError ? "!border-priority-high" : ""}`}
                      />
                      <FieldMsg id={`rename-${o.id}-msg`} error={renameError} hint="Enter to save, Escape to cancel." />
                    </form>
                  ) : (
                    <p className="flex min-w-0 items-center gap-1">
                      <span className="break-words text-[15.5px] font-semibold text-ink">{o.topic}</span>
                      {editable ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            renameDone.current = null;
                            setRenaming(o.id);
                            setRenameText(o.topic);
                          }}
                          aria-label={`Rename ${o.topic}`}
                          title="Rename"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl text-ink-4 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:!rounded-ctl"
                        >
                          <PencilSimple size={15} aria-hidden />
                        </button>
                      ) : null}
                    </p>
                  )}
                  <div className="min-w-0">
                    {editable ? (
                      <MemberPicker
                        members={members ?? []}
                        value={o.owner_user_id}
                        onChange={(id) => id && id !== o.owner_user_id && change(o, { owner_user_id: id })}
                        label={`Owner of ${o.topic}`}
                        size="sm"
                        disabled={busy}
                      />
                    ) : (
                      <PersonLine member={person} />
                    )}
                  </div>
                  {editable ? (
                    <div className="-ml-2 md:ml-0">
                      <RemoveButton what={o.topic} compact disabled={busy} onConfirm={() => remove(o)} />
                    </div>
                  ) : (
                    <span className="hidden md:block" />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line bg-surface-2 px-4 py-3 sm:px-[22px]">
            <FlashLine flash={flash} />
            <span className="text-[13px] tabular-nums text-ink-3">
              {owners.length} of {L.max}
              {owners.length < L.ready ? `. ${L.ready - owners.length} more for readiness.` : ""}
            </span>
          </div>
        ) : null}
      </div>

      <aside aria-labelledby="by-person-h" className="rounded-card border border-line bg-surface-2 p-5 xl:sticky xl:top-4">
        <h3 id="by-person-h" className="text-[15px] font-semibold text-ink">
          By person
        </h3>
        {byPerson.length === 0 ? (
          <p className="mt-2 text-[14px] text-ink-3">Each owner shows here with their topics.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {byPerson.map(([id, topics]) => {
              const m = people.get(id);
              return (
                <li key={id} className="flex items-start gap-3">
                  <Avatar name={m?.name ?? "Former member"} id={m?.email ?? id} src={m?.imageUrl} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-semibold text-ink">
                      {m?.name ?? "Not in the workspace"}
                      <span className="font-normal text-ink-3"> owns {topics.length}</span>
                    </p>
                    <p className="mt-0.5 text-[13.5px] leading-snug text-ink-3">{topics.join(", ")}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>
    </div>
  );
}
