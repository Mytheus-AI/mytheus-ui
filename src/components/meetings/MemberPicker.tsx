"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion, type Transition } from "framer-motion";
import { CaretLeft, MagnifyingGlass, UserPlus, WarningCircle } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { useOrgContext } from "@/lib/org-context";
import { CLUSTER_MAX, clusterOf, neighbourAfterRemoval, peopleCount, selectionMessage, toggleId } from "./picker-cluster";

/* Pick workspace members to invite. Shared by the New meeting dialog and the meeting page's
   Invite dialog. Members come from the server already resolved (internal ids, Clerk names).
   Inviting people to the workspace is an admin task (Workspace > Members), so only an admin is
   offered that link; a member is told who can do it instead of being sent to a page they
   cannot open.

   Picking someone collapses their row and their face travels (a shared-layout spring, about a
   quarter second) into one line of overlapping balls above the list; the list keeps only the
   people not picked yet, so it stays short. Past eight balls the earliest fold into a "+N" ball
   that shows everyone. A ball is a button: click it, or press Backspace or Delete on it, and the
   person pops back into the list. Keyboard: arrows move through the list (Up from the top goes
   to the search) and through the balls (Left and Right, Down returns to the list). Each change
   is announced politely. Under reduced motion the move is a short crossfade with no travel. */

export type PickableMember = { id: string; name: string; email: string };

const SPRING: Transition = { type: "spring", duration: 0.24, bounce: 0.12 };
const FADE: Transition = { duration: 0.12, ease: "linear" };
const MORE = "__more";

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
  const reduce = useReducedMotion() ?? false;
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [rowStop, setRowStop] = useState<string | null>(null);
  const [ballStop, setBallStop] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const ballRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{ kind: "row" | "ball"; id: string } | "search" | null>(null);

  const byId = useMemo(() => new Map((members ?? []).map((m) => [m.id, m])), [members]);
  // Picked people in picking order; ids no longer in the list are skipped, as before.
  const chosen = useMemo(() => selected.map((id) => byId.get(id)).filter((m): m is PickableMember => Boolean(m)), [selected, byId]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rest = (members ?? []).filter((m) => !selected.includes(m.id));
    return needle ? rest.filter((m) => m.name.toLowerCase().includes(needle) || m.email.toLowerCase().includes(needle)) : rest;
  }, [members, selected, q]);
  const { visible, hidden } = clusterOf(chosen, undefined, expanded);
  const ballIds = [...(hidden.length ? [MORE] : []), ...visible.map((m) => m.id), ...(expanded && chosen.length > CLUSTER_MAX ? [MORE] : [])];

  // Fold the cluster back once it fits again.
  useEffect(() => {
    if (expanded && chosen.length <= CLUSTER_MAX) setExpanded(false);
  }, [expanded, chosen.length]);

  // Move focus once the list and the cluster have re-rendered after a change.
  useEffect(() => {
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    if (target === "search") return searchRef.current?.focus();
    const el = (target.kind === "row" ? rowRefs.current : ballRefs.current).get(target.id);
    if (el) return el.focus();
    const firstBall = target.kind === "ball" ? ballRefs.current.values().next().value : undefined;
    (firstBall ?? rowRefs.current.get(shown[0]?.id ?? "") ?? searchRef.current)?.focus();
  });

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

  const faceId = (id: string) => (reduce ? undefined : `${uid}-face-${id}`);
  const firstRowFocus = () => (shown[0] ? { kind: "row" as const, id: shown[0].id } : null);

  const add = (m: PickableMember) => {
    const next = toggleId(selected, m.id);
    const n = neighbourAfterRemoval(shown.findIndex((r) => r.id === m.id), shown.length);
    const after = shown.filter((r) => r.id !== m.id);
    pendingFocus.current = n !== null ? { kind: "row", id: after[n].id } : searchRef.current ? "search" : { kind: "ball", id: m.id };
    if (n !== null) setRowStop(after[n].id);
    setMessage(selectionMessage(m.name, true, next.length));
    onChange(next);
  };
  const remove = (m: PickableMember) => {
    const next = toggleId(selected, m.id);
    const n = neighbourAfterRemoval(ballIds.indexOf(m.id), ballIds.length);
    const after = ballIds.filter((id) => id !== m.id);
    pendingFocus.current = n !== null ? { kind: "ball", id: after[n] } : { kind: "row", id: m.id };
    if (n !== null) setBallStop(after[n]);
    setRowStop(m.id);
    setMessage(selectionMessage(m.name, false, next.length));
    onChange(next);
  };

  const rowTab = shown.some((m) => m.id === rowStop) ? rowStop : shown[0]?.id;
  const ballTab = ballStop && ballIds.includes(ballStop) ? ballStop : ballIds[0];

  const focusRow = (id: string | undefined) => {
    if (!id) return;
    setRowStop(id);
    rowRefs.current.get(id)?.focus();
  };
  const focusBall = (id: string | undefined) => {
    if (!id) return;
    setBallStop(id);
    ballRefs.current.get(id)?.focus();
  };

  const onRowKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === "ArrowDown") focusRow(shown[Math.min(i + 1, shown.length - 1)]?.id);
    else if (e.key === "ArrowUp") {
      if (i === 0) {
        if (searchRef.current) searchRef.current.focus();
        else focusBall(ballTab);
      } else focusRow(shown[i - 1]?.id);
    } else if (e.key === "Home") focusRow(shown[0]?.id);
    else if (e.key === "End") focusRow(shown[shown.length - 1]?.id);
    else return;
    e.preventDefault();
  };
  const onBallKey = (e: KeyboardEvent<HTMLButtonElement>, i: number, m: PickableMember | null) => {
    if (e.key === "ArrowRight") focusBall(ballIds[Math.min(i + 1, ballIds.length - 1)]);
    else if (e.key === "ArrowLeft") focusBall(ballIds[Math.max(i - 1, 0)]);
    else if (e.key === "Home") focusBall(ballIds[0]);
    else if (e.key === "End") focusBall(ballIds[ballIds.length - 1]);
    else if (e.key === "ArrowDown") {
      const first = firstRowFocus();
      if (first) focusRow(rowTab ?? first.id);
    } else if ((e.key === "Backspace" || e.key === "Delete") && m && !disabled) remove(m);
    else return;
    e.preventDefault();
  };

  const toggleMore = () => {
    setExpanded((x) => !x);
    pendingFocus.current = { kind: "ball", id: MORE };
    setBallStop(MORE);
  };
  const moreBall = (i: number) => (
    <motion.li key={MORE} layout={!reduce} className="mh-pick-ballslot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={reduce ? FADE : SPRING}>
      <button
        ref={(el) => {
          if (el) ballRefs.current.set(MORE, el);
          else ballRefs.current.delete(MORE);
        }}
        type="button"
        className="mh-pick-ball is-more tap"
        tabIndex={ballTab === MORE ? 0 : -1}
        aria-expanded={expanded}
        aria-label={expanded ? "Show fewer people" : `Show ${hidden.length} more ${hidden.length === 1 ? "person" : "people"}`}
        disabled={disabled}
        onClick={toggleMore}
        onKeyDown={(e) => onBallKey(e, i, null)}
      >
        {expanded ? <CaretLeft size={14} weight="bold" aria-hidden="true" /> : <span aria-hidden="true">+{hidden.length}</span>}
        <span className="mh-pick-tip" aria-hidden="true">
          {expanded ? "Show fewer" : `${hidden.length} more`}
        </span>
      </button>
    </motion.li>
  );

  return (
    <LayoutGroup id={uid}>
      <div className="mh-pick">
        {members.length > 4 && (
          <label className="mh-pick-search">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" && shown[0]) {
                  e.preventDefault();
                  focusRow(rowTab ?? shown[0].id);
                }
              }}
              placeholder={`Search ${members.length} people`}
              aria-label="Search people"
              aria-controls={`${uid}-list`}
              disabled={disabled}
            />
          </label>
        )}

        <div className={`mh-pick-cluster${expanded ? " is-expanded" : ""}`}>
          <ul className="mh-pick-balls" aria-label="Invited">
            <AnimatePresence initial={false} mode="popLayout">
              {hidden.length > 0 ? moreBall(0) : null}
              {visible.map((m, vi) => {
                const i = vi + (hidden.length ? 1 : 0);
                return (
                  <motion.li
                    key={m.id}
                    layout={!reduce}
                    className="mh-pick-ballslot"
                    initial={reduce ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                    transition={reduce ? FADE : SPRING}
                  >
                    <motion.button
                      ref={(el: HTMLButtonElement | null) => {
                        if (el) ballRefs.current.set(m.id, el);
                        else ballRefs.current.delete(m.id);
                      }}
                      layoutId={faceId(m.id)}
                      transition={SPRING}
                      type="button"
                      className={`mh-pick-ball tap${vi >= visible.length / 2 ? " tip-end" : ""}`}
                      tabIndex={ballTab === m.id ? 0 : -1}
                      aria-label={`Remove ${m.name}`}
                      disabled={disabled}
                      onClick={() => remove(m)}
                      onKeyDown={(e) => onBallKey(e, i, m)}
                    >
                      <span className="mh-pick-ballface" aria-hidden="true">
                        <Avatar name={m.name} id={m.email} size="md" />
                      </span>
                      <span className="mh-pick-tip" aria-hidden="true">
                        {m.name}
                      </span>
                    </motion.button>
                  </motion.li>
                );
              })}
              {expanded && chosen.length > CLUSTER_MAX ? moreBall(ballIds.length - 1) : null}
            </AnimatePresence>
          </ul>
          <span className="mh-pick-count">{peopleCount(chosen.length)}</span>
        </div>
        <span className="sr-only" role="status" aria-live="polite">
          {message}
        </span>

        <motion.ul layoutScroll className="mh-pick-list" id={`${uid}-list`} aria-label="Workspace members">
          <AnimatePresence initial={false}>
            {shown.map((m, i) => (
              <motion.li
                key={m.id}
                className="mh-pick-rowslot"
                // The row only opens and closes (no fade): the face travelling to or from its
                // ball lives inside it. Under reduced motion it is a short crossfade instead.
                initial={reduce ? { opacity: 0 } : { height: 0 }}
                animate={reduce ? { opacity: 1 } : { height: "auto" }}
                exit={reduce ? { opacity: 0 } : { height: 0 }}
                transition={reduce ? FADE : SPRING}
              >
                <button
                  ref={(el) => {
                    if (el) rowRefs.current.set(m.id, el);
                    else rowRefs.current.delete(m.id);
                  }}
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  tabIndex={rowTab === m.id ? 0 : -1}
                  className="mh-pick-row tap"
                  disabled={disabled}
                  onClick={() => add(m)}
                  onKeyDown={(e) => onRowKey(e, i)}
                >
                  <motion.span layoutId={faceId(m.id)} transition={SPRING} className="mh-pick-face" aria-hidden="true">
                    <Avatar name={m.name} id={m.email} size="md" />
                  </motion.span>
                  <span className="mh-pick-who">
                    <strong>{m.name}</strong>
                    <small>{m.email}</small>
                  </span>
                  <span className="mh-pick-box" aria-hidden="true" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
          {shown.length === 0 && (
            <li className="mh-pick-note">{q.trim() ? <>No one matches &ldquo;{q.trim()}&rdquo;.</> : "Everyone here is picked."}</li>
          )}
        </motion.ul>
      </div>
    </LayoutGroup>
  );
}
