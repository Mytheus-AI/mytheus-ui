"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { NotePencil, Plus, Sparkle } from "@phosphor-icons/react";
import { replaceAgenda, setAgendaItemStatus } from "@/app/actions/agenda";
import { AGENDA_STATUSES, type AgendaItem, type AgendaStatus } from "@/lib/api/meeting-agenda-types";
import {
  agendaProgress,
  beginHostStatus,
  commitHostStatus,
  initialAgendaState,
  rollbackHostStatus,
  type AgendaState,
} from "@/lib/realtime/agenda";
import { AgendaEditor, type AgendaPerson } from "./AgendaEditor";
import { rowsFromItems, validateAgenda, type AgendaDraftRow, type AgendaRowErrors } from "./agenda-editor-model";
import { STATUS_LABEL, STATUS_TONE, itemMeta, statusSourceText } from "./agenda-status";
import { Chip } from "./Chip";

/* The agenda on the meeting page (ADR-0038 D6, D11): each item with its owner, minutes, status
   and the meeting agent's note. Who set a status (the agent or the host) is said quietly under it.

   The host or the creator may change it: Edit agenda replaces it (`PUT .../agenda`, items keep
   their status), and each item's status can be set (`PATCH .../agenda/{id}`), applied at once and
   put back if the server refuses. After the meeting has ended the agenda is a read-only record. */

let opSeq = 0;

export function MeetingAgendaCard({
  meetingId,
  items,
  people,
  canEdit,
  ended,
  meetingMinutes,
}: {
  meetingId: string;
  items: AgendaItem[];
  /** The meeting's participants, the host included: owner names and the owner picker. */
  people: AgendaPerson[];
  /** You are the host or the creator. */
  canEdit: boolean;
  ended: boolean;
  meetingMinutes: number;
}) {
  const router = useRouter();
  const uid = useId();
  const [state, setState] = useState<AgendaState>(() => initialAgendaState(items));
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<AgendaDraftRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, AgendaRowErrors>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const names = new Map(people.map((p) => [p.id, p.name]));
  const nameOf = (id: string) => names.get(id) ?? "Former member";
  const steer = canEdit && !ended;
  const { done, total } = agendaProgress(state.items);

  const startEdit = () => {
    setRows(rowsFromItems(state.items));
    setRowErrors({});
    setMessage(null);
    setEditing(true);
    window.requestAnimationFrame(() => document.getElementById(`${uid}-editor`)?.querySelector("input")?.focus());
  };

  const save = async () => {
    const checked = validateAgenda(
      rows,
      people.map((p) => p.id),
    );
    if (!checked.ok) {
      setRowErrors(checked.rows);
      return setMessage(checked.message);
    }
    setSaving(true);
    setMessage(null);
    const res = await replaceAgenda(meetingId, checked.items);
    setSaving(false);
    if (!res.ok) return setMessage(res.message);
    setState(initialAgendaState(res.items));
    setEditing(false);
    window.requestAnimationFrame(() => document.getElementById(`${uid}-edit`)?.focus());
    router.refresh();
  };

  const setStatus = async (item: AgendaItem, status: AgendaStatus) => {
    if (status === item.status) return;
    const op = ++opSeq;
    setMessage(null);
    setState((s) => beginHostStatus(s, item.id, status, op));
    const res = await setAgendaItemStatus(meetingId, item.id, status);
    if (res.ok) {
      setState((s) => commitHostStatus(s, item.id, op, res.item));
    } else {
      setState((s) => rollbackHostStatus(s, item.id, op));
      setMessage(res.message);
    }
  };

  return (
    <section className="mx-card mx-card-pad ag-card" aria-labelledby={`${uid}-h`}>
      <div className="mx-card-head">
        <h2 className="mx-card-title" id={`${uid}-h`}>
          Agenda
        </h2>
        <span className="ag-card-end">
          {total > 0 && !editing ? (
            <span className="mx-card-note">
              {done} of {total} done
            </span>
          ) : null}
          {steer && !editing ? (
            <button id={`${uid}-edit`} type="button" className="mx-btn is-outline is-sm tap" onClick={startEdit}>
              {total > 0 ? (
                <>
                  <NotePencil size={16} aria-hidden="true" />
                  Edit agenda
                </>
              ) : (
                <>
                  <Plus size={16} weight="bold" aria-hidden="true" />
                  Add an agenda
                </>
              )}
            </button>
          ) : null}
        </span>
      </div>

      {editing ? (
        <div id={`${uid}-editor`}>
          <AgendaEditor
            rows={rows}
            onChange={(next) => {
              setRows(next);
              if (Object.keys(rowErrors).length > 0) setRowErrors({});
            }}
            people={people}
            errors={rowErrors}
            meetingMinutes={meetingMinutes}
            disabled={saving}
          />
          {message ? (
            <p className="ag-msg" role="alert">
              {message}
            </p>
          ) : null}
          <div className="ag-edit-acts">
            <button
              type="button"
              className="mx-btn is-outline is-sm tap"
              disabled={saving}
              onClick={() => {
                setEditing(false);
                setMessage(null);
                window.requestAnimationFrame(() => document.getElementById(`${uid}-edit`)?.focus());
              }}
            >
              Cancel
            </button>
            <button type="button" className="mx-btn is-sm tap" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save agenda"}
            </button>
          </div>
        </div>
      ) : state.items.length === 0 ? (
        <p className="mx-help">
          {ended
            ? "This meeting had no agenda."
            : steer
              ? "No agenda yet. Add the topics to cover; the meeting agent tracks them during the call and tells you what is left."
              : "No agenda yet. The host can add one."}
        </p>
      ) : (
        <>
          <ol className="ag-list">
            {state.items.map((item, i) => {
              const meta = itemMeta(item, nameOf);
              const source = statusSourceText(item);
              return (
                <li key={item.id} className={`ag-item is-${item.status}`}>
                  <span className="ag-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="ag-body">
                    <p className="ag-title">{item.title}</p>
                    {meta ? <p className="ag-meta">{meta}</p> : null}
                    {item.agent_note ? (
                      <p className="ag-note">
                        <Sparkle size={13} aria-hidden="true" />
                        <span>
                          <span className="sr-only">Meeting agent note: </span>
                          {item.agent_note}
                        </span>
                      </p>
                    ) : null}
                    {source ? <p className="ag-src">{source}</p> : null}
                  </div>
                  <div className="ag-status">
                    {steer ? (
                      <label className="ag-status-pick">
                        <span className="sr-only">Status of {item.title}</span>
                        <select
                          value={item.status}
                          className={`is-${STATUS_TONE[item.status]}`}
                          onChange={(e) => void setStatus(item, e.target.value as AgendaStatus)}
                        >
                          {AGENDA_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <Chip tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Chip>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {message ? (
            <p className="ag-msg" role="alert">
              {message}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
