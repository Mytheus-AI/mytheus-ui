"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowRight, CaretDown, CheckCircle, Clock, ListChecks, MinusCircle, Plus, Robot } from "@phosphor-icons/react";
import { setAgendaItemStatus } from "@/app/actions/agenda";
import { useCallToast } from "@/components/call/CallToast";
import { advanceAgenda, extendAgendaItem } from "@/components/room/stage-actions";
import type { AgendaItem, AgendaStatus } from "@/lib/api/meeting-agenda-types";
import type { AgendaState } from "@/lib/realtime/agenda";
import { clock, minutesPhrase, spokenItemTime, stageView, type StageView } from "@/lib/realtime/stage";
import type { MeetingSocketState } from "@/lib/realtime/useMeetingSocket";

/* The agenda as the room's spine (polish program, Phase 1): one thin bar above the stage that
   everyone sees, the host included. It says what is being discussed now, how long it has run
   against its plan (amber once it runs over), what comes next and who owns it.

   For the host (or the creator) it carries the controls inline: Start next (finishes the current
   item as covered and starts the next, in one server write), +5 min, and a small menu with Mark
   covered, Skip and +10 min. Each write goes to core-api first; the stored rows are applied here
   at once and then announced to the room through the gateway ("agenda-status"), so everyone's
   bar moves within a second, and a reload reads the same rows back.

   With no agenda it is one slim line (UI polish pass), with the host's "Add agenda".

   The item's clock is the server's `started_at`, so two people never see two different times. The
   digits tick once a second but are hidden from screen readers; the bar's label carries a calm,
   minute-level phrase, and running over is announced once. */

let opSeq = 1_000_000;

export function StageBar({
  meetingId,
  agenda,
  host,
  steers,
  nameOf,
  standInIds,
  onAddAgenda,
  children,
}: {
  meetingId: string;
  agenda: AgendaState;
  host: MeetingSocketState["agendaHost"];
  /** You host or created the meeting: the controls are yours. */
  steers: boolean;
  nameOf: (id: string) => string;
  /** People who sent their agent instead of coming, so an item they own says so. */
  standInIds: ReadonlySet<string>;
  /** The host's way to add an agenda when there is none. */
  onAddAgenda?: () => void;
  /** Rows under the bar (the catch-up line, a stand-in's questions). */
  children?: React.ReactNode;
}) {
  const uid = useId();
  const toast = useCallToast();
  const [now, setNow] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrap = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const view: StageView = stageView(agenda.items, now ?? 0);
  const ticking = now !== null;

  // Running over is said once per item, politely; the clock itself is never read out.
  const [overNote, setOverNote] = useState("");
  const announcedOver = useRef<string | null>(null);
  const overId = view.over ? view.current?.id ?? null : null;
  const overTitle = view.current?.title ?? "";
  const overPlan = view.plannedSeconds ?? 0;
  useEffect(() => {
    if (!overId || announcedOver.current === overId) return;
    announcedOver.current = overId;
    setOverNote(`${overTitle} is over its planned ${minutesPhrase(overPlan)}.`);
  }, [overId, overTitle, overPlan]);

  const closeMenu = useCallback((refocus = true) => {
    setMenuOpen(false);
    if (refocus) window.setTimeout(() => menuButton.current?.focus(), 0);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    menuWrap.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
    const onDown = (e: PointerEvent) => {
      if (menuWrap.current && !menuWrap.current.contains(e.target as Node)) closeMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [menuOpen, closeMenu]);

  const startNext = async (outcome: "covered" | "skipped") => {
    setBusy("advance");
    const res = await advanceAgenda(meetingId, outcome);
    setBusy(null);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    host.applyRows(res.items);
    if (res.items.length) void host.announceMany(res.items.map((it) => it.id));
    toast(res.current ? `Started ${res.current.title}` : "Agenda done", "success");
  };

  const extend = async (item: AgendaItem, minutes: number) => {
    setBusy("extend");
    const res = await extendAgendaItem(meetingId, item.id, minutes);
    setBusy(null);
    if (!res.ok) {
      toast(res.message, "error");
      return;
    }
    host.applyRows([res.item]);
    void host.announce(item.id);
    toast(`Added ${minutes} minutes to ${item.title}`, "success");
  };

  const mark = async (item: AgendaItem, status: AgendaStatus) => {
    const op = ++opSeq;
    setBusy("mark");
    host.begin(item.id, status, op);
    const res = await setAgendaItemStatus(meetingId, item.id, status);
    setBusy(null);
    if (res.ok) {
      host.commit(item.id, op, res.item);
      void host.announce(item.id);
      toast(status === "covered" ? "Marked covered" : "Marked skipped", "success");
    } else {
      host.rollback(item.id, op);
      toast(res.message, "error");
    }
  };

  const ownerLabel = (item: AgendaItem | null) => {
    if (!item?.owner_user_id) return null;
    const name = nameOf(item.owner_user_id);
    return standInIds.has(item.owner_user_id) ? `${name}'s agent` : name;
  };

  const timeClass = view.over ? " is-over" : view.nearlyOver ? " is-near" : "";
  const pct =
    view.plannedSeconds && view.elapsedSeconds !== null
      ? Math.min(100, Math.round((view.elapsedSeconds / view.plannedSeconds) * 100))
      : 0;

  if (!agenda.loaded) {
    return (
      <section className="stage-bar is-loading" aria-labelledby={`${uid}-h`} aria-busy="true">
        <h2 id={`${uid}-h`} className="sr-only">
          Agenda
        </h2>
        <span className="sb-skel" aria-hidden />
        <span className="sr-only">Loading the agenda</span>
        {children}
      </section>
    );
  }

  // Said when the item changes, never as the clock moves.
  const label =
    view.phase === "running" && view.current
      ? `Now: item ${view.number} of ${view.total}, ${view.current.title}.`
      : view.phase === "not_started"
        ? `Agenda: ${view.total} items, not started yet.`
        : view.phase === "done"
          ? `Agenda done: all ${view.total} items.`
          : `Agenda: ${view.done} of ${view.total} items done.`;

  // No agenda: one slim, calm line instead of a card (on a phone it must not cost the stage its
  // height). The host gets "Add agenda" right there; rows under the bar (the catch-up line, a
  // stand-in's questions) still draw as the card they always were.
  if (view.phase === "empty") {
    return (
      <section className="stage-bar is-empty" aria-labelledby={`${uid}-h`}>
        <h2 id={`${uid}-h`} className="sr-only">
          Agenda
        </h2>
        <div className="sb-empty">
          <span className="sb-empty-chip">
            <ListChecks size={15} aria-hidden />
            <span>No agenda</span>
            <span className="sb-empty-sub">, the meeting agent takes notes as you go</span>
          </span>
          {steers && onAddAgenda ? (
            <button type="button" className="sb-empty-add tap" onClick={onAddAgenda}>
              <Plus size={14} weight="bold" aria-hidden />
              Add agenda
            </button>
          ) : null}
          {agenda.stale ? (
            <span className="sb-empty-stale" role="status">
              May be out of date
            </span>
          ) : null}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className={`stage-bar is-${view.phase}${timeClass}`} aria-labelledby={`${uid}-h`}>
      <h2 id={`${uid}-h`} className="sr-only">
        Agenda
      </h2>
      <div className="sb-row">
        {view.total > 0 ? (
          <ol className="sb-track" aria-hidden="true">
            {[...agenda.items]
              .sort((a, b) => a.position - b.position)
              .map((it) => (
                <li
                  key={it.id}
                  className={`sb-seg is-${it.status}${it.id === view.current?.id && view.over ? " is-over" : ""}`}
                />
              ))}
          </ol>
        ) : null}

        <div className="sb-now">
          {view.phase === "done" ? (
            <p className="sb-title">
              <CheckCircle size={18} weight="fill" className="sb-done-ico" aria-hidden />
              <span>Agenda done</span>
              <span className="sb-sub">All {view.total} items covered or skipped</span>
            </p>
          ) : view.current ? (
            <p className="sb-title">
              <span className="sb-kicker">Now, {view.number} of {view.total}</span>
              <span className="sb-name" title={view.current.title}>
                {view.current.title}
              </span>
              {ownerLabel(view.current) ? (
                <span className="sb-owner">
                  {view.current.owner_user_id && standInIds.has(view.current.owner_user_id) ? (
                    <Robot size={13} aria-hidden />
                  ) : null}
                  {ownerLabel(view.current)}
                </span>
              ) : null}
            </p>
          ) : (
            <p className="sb-title">
              <span className="sb-kicker">{view.done === 0 ? "Not started" : "Between items"}</span>
              <span className="sb-name">{view.done === 0 ? `${view.total} items on the agenda` : `${view.done} of ${view.total} done`}</span>
            </p>
          )}
        </div>

        {view.phase === "running" && view.current ? (
          <div className={`sb-time${timeClass}`} role="img" aria-label={spokenItemTime(view)}>
            <Clock size={15} aria-hidden />
            <span className="sb-clock" aria-hidden>
              {ticking && view.elapsedSeconds !== null ? clock(view.elapsedSeconds) : "0:00"}
            </span>
            <span className="sb-plan" aria-hidden>
              {view.plannedSeconds !== null ? `of ${minutesPhrase(view.plannedSeconds)}` : "no time set"}
            </span>
            {view.over && view.plannedSeconds !== null && view.elapsedSeconds !== null ? (
              <span className="sb-over" aria-hidden>
                {minutesPhrase(view.elapsedSeconds - view.plannedSeconds)} over
              </span>
            ) : null}
            {view.plannedSeconds !== null ? (
              <span className="sb-meter" aria-hidden>
                <i style={{ width: `${pct}%` }} />
              </span>
            ) : null}
          </div>
        ) : null}

        {view.next && (view.current || view.phase !== "not_started") ? (
          <p className="sb-next">
            <span className="sb-kicker">Next</span>
            <span className="sb-next-name" title={view.next.title}>
              {view.next.title}
            </span>
            {ownerLabel(view.next) ? <span className="sb-next-owner">{ownerLabel(view.next)}</span> : null}
          </p>
        ) : null}

        {steers && view.phase !== "done" ? (
          <div className="sb-acts" role="group" aria-label="Agenda controls">
            <button
              type="button"
              className="sb-btn is-primary tap"
              disabled={busy !== null}
              onClick={() => void startNext("covered")}
              aria-label={
                view.current
                  ? view.next
                    ? `Start next: ${view.next.title}`
                    : `Finish ${view.current.title}`
                  : view.next
                    ? `Start ${view.next.title}`
                    : "Start the agenda"
              }
            >
              {view.current && !view.next ? <CheckCircle size={16} aria-hidden /> : <ArrowRight size={16} weight="bold" aria-hidden />}
              <span className="sb-btn-label">{view.current ? (view.next ? "Start next" : "Finish") : view.done === 0 ? "Start agenda" : "Start next"}</span>
            </button>
            {view.current ? (
              <>
                <button
                  type="button"
                  className={`sb-btn tap${view.over ? " is-warn" : ""}`}
                  disabled={busy !== null}
                  onClick={() => void extend(view.current!, 5)}
                  aria-label={`Add 5 minutes to ${view.current.title}`}
                >
                  <Plus size={14} weight="bold" aria-hidden />5 min
                </button>
                <div
                  className="sb-menu"
                  ref={menuWrap}
                  onKeyDown={(e) => {
                    if (e.key === "Escape" && menuOpen) {
                      e.stopPropagation();
                      closeMenu();
                    }
                    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && menuOpen) {
                      e.preventDefault();
                      const items = Array.from(menuWrap.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
                      const at = items.indexOf(document.activeElement as HTMLElement);
                      const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
                      items[next]?.focus();
                    }
                  }}
                  onBlur={(e) => {
                    if (menuOpen && menuWrap.current && !menuWrap.current.contains(e.relatedTarget as Node | null)) closeMenu(false);
                  }}
                >
                  <button
                    ref={menuButton}
                    type="button"
                    className={`sb-btn is-icon tap${menuOpen ? " is-open" : ""}`}
                    aria-label="More agenda controls"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-controls={`${uid}-menu`}
                    disabled={busy !== null}
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <CaretDown size={14} weight="bold" aria-hidden />
                  </button>
                  <div id={`${uid}-menu`} role="menu" aria-label="More agenda controls" className="sb-menu-panel" hidden={!menuOpen}>
                    {menuOpen ? (
                      <>
                        <button
                          type="button"
                          role="menuitem"
                          className="sb-menu-item"
                          onClick={() => {
                            closeMenu();
                            void mark(view.current!, "covered");
                          }}
                        >
                          <CheckCircle size={16} aria-hidden />
                          Mark covered, don&rsquo;t start next
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="sb-menu-item"
                          onClick={() => {
                            closeMenu();
                            void startNext("skipped");
                          }}
                        >
                          <MinusCircle size={16} aria-hidden />
                          Skip this item{view.next ? " and start next" : ""}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="sb-menu-item"
                          onClick={() => {
                            closeMenu();
                            void extend(view.current!, 10);
                          }}
                        >
                          <Plus size={16} aria-hidden />
                          Add 10 minutes
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {agenda.stale ? (
          <span className="sb-stale" role="status">
            May be out of date
          </span>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {overNote}
      </p>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {label}
      </p>
      {children}
    </section>
  );
}
