"use client";

import { useId, useState } from "react";
import {
  ArrowBendUpLeft,
  CheckCircle,
  Circle,
  CircleHalf,
  Compass,
  MinusCircle,
  Robot,
  Sparkle,
  Timer,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { setAgendaItemStatus } from "@/app/actions/agenda";
import { useCallToast } from "@/components/call/CallToast";
import { STATUS_LABEL, itemMeta, statusSourceText } from "@/components/meetings/agenda-status";
import type { AgendaItem, AgendaStatus, NudgeType } from "@/lib/api/meeting-agenda-types";
import { AgentOrb } from "@/components/agent/AgentOrb";
import {
  NUDGE_LABEL,
  agendaProgress,
  nudgeTone,
  proxyNudgeText,
  type AgendaState,
  type NudgeState,
  type Proxy,
} from "@/lib/realtime/agenda";
import { agentFace } from "@/lib/realtime/agent-persona";
import { useRoomNames } from "@/lib/realtime/room-names";
import type { MeetingSocketState } from "@/lib/realtime/useMeetingSocket";

/* The shared live agenda in the room's Agent tab (ADR-0038 D9, D11). Everyone sees the same list:
   it is rendered with the page, re-read from core-api on every (re)connect, and moved along live
   by the MeetingAgent's "agent-agenda" events. The host (or the creator) can mark an item covered
   or skipped, or reopen it: applied at once, put back if core-api refuses, and never overridden
   by the agent afterwards. Once core-api has stored it, the room is told ("agenda-status" through
   the gateway, which re-reads the item first), so everyone's agenda moves within a second
   (polish program, Phase 0: it used to change on the host's screen only).

   Nudges ("agent-nudge") reach the host only. One shows at a time above the list, as a calm card
   in the frozen language: running over is amber (attention), off the agenda and still-open items
   are blue (informs). Dismiss shows the next one, if any. Nothing about a nudge is saved.

   ADR-0039 C5: when an item owned by someone who sent their agent comes up, the host gets a blue
   `proxy_update` nudge carrying that person's update in full, under their Myte's face. */

const STATUS_ICON: Record<AgendaStatus, Icon> = {
  pending: Circle,
  in_progress: CircleHalf,
  covered: CheckCircle,
  skipped: MinusCircle,
};

const NUDGE_ICON: Record<NudgeType, Icon> = {
  over_time: Timer,
  off_agenda: Compass,
  unaddressed: ArrowBendUpLeft,
  proxy_update: Robot,
};

const DONE_TOAST: Record<AgendaStatus, string> = {
  covered: "Marked covered",
  skipped: "Marked skipped",
  pending: "Item reopened",
  in_progress: "Marked in progress",
};

let opSeq = 0;

export function AgendaPanel({
  meetingId,
  agenda,
  host,
  nudges,
  onDismissNudge,
  steers,
  nameOf,
  proxies = [],
}: {
  meetingId: string;
  agenda: AgendaState;
  host: MeetingSocketState["agendaHost"];
  nudges: NudgeState;
  onDismissNudge: (id: string) => void;
  /** You host or created the meeting: you may mark items. */
  steers: boolean;
  nameOf: (id: string) => string;
  /** Who sent their agent, with their update (ADR-0039 B5), for the `proxy_update` nudge. */
  proxies?: Proxy[];
}) {
  const roomNames = useRoomNames();
  const toast = useCallToast();
  const uid = useId();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const { done, total } = agendaProgress(agenda.items);
  const nudge = nudges.current;
  const nudgeItem = nudge?.itemId ? agenda.items.find((it) => it.id === nudge.itemId) ?? null : null;
  const proxyNudge = nudge ? proxyNudgeText(nudge, agenda.items, proxies) : null;
  const proxyFace =
    nudge?.type === "proxy_update" && proxyNudge?.ownerId
      ? agentFace(
          proxyNudge.ownerId,
          roomNames[proxyNudge.ownerId]?.name ?? null,
          roomNames[proxyNudge.ownerId]?.agentName,
          roomNames[proxyNudge.ownerId]?.agentSeed,
        )
      : null;

  const mark = async (item: AgendaItem, status: AgendaStatus) => {
    const op = ++opSeq;
    setBusy((s) => new Set(s).add(item.id));
    host.begin(item.id, status, op);
    const res = await setAgendaItemStatus(meetingId, item.id, status);
    setBusy((s) => {
      const next = new Set(s);
      next.delete(item.id);
      return next;
    });
    if (res.ok) {
      host.commit(item.id, op, res.item);
      toast(DONE_TOAST[status], "success");
      // Everyone else's agenda moves too. If the room link is down, their next re-hydrate
      // (on reconnect) brings it; nothing is lost, so this is not an error for the host.
      void host.announce(item.id);
    } else {
      host.rollback(item.id, op);
      toast(res.message, "error");
    }
  };

  return (
    <div className="agenda" role="group" aria-labelledby={`${uid}-h`}>
      <div className="side-sec">
        <h3 id={`${uid}-h`}>Agenda</h3>
        {total > 0 ? (
          <span className="mx-count">
            {done} of {total}
            <span className="sr-only"> done</span>
          </span>
        ) : null}
        <span className="side-sec-end">
          <span className="mx-chip">
            <UsersThree size={14} aria-hidden />
            Shared
          </span>
        </span>
      </div>

      {nudge ? (
        <div
          className={`nfy-card is-alert is-nudge is-p${nudgeTone(nudge.type) === "medium" ? 2 : 3}`}
          role="status"
          data-nudge-id={nudge.id}
          key={nudge.id}
        >
          <div className="nfy-kind">
            {proxyFace ? (
              <span className="cx-agent-badge nudge-face" aria-hidden="true">
                <AgentOrb seed={proxyFace.seed} size={22} />
              </span>
            ) : (
              (() => {
                const NIcon = NUDGE_ICON[nudge.type];
                return <NIcon size={16} weight="bold" aria-hidden />;
              })()
            )}
            {proxyFace && proxyNudge?.ownerId
              ? `${nameOf(proxyNudge.ownerId)} sent their Myte`
              : NUDGE_LABEL[nudge.type]}
            <span className="nfy-meta">Only you</span>
          </div>
          {nudge.type === "proxy_update" ? (
            <p className="nfy-text nudge-proxy">
              <span className="sr-only">Their update: </span>
              {proxyNudge?.text ?? nudge.content}
            </p>
          ) : (
            <p className="nfy-text">{nudge.content}</p>
          )}
          {nudgeItem ? <p className="nfy-sub">On {nudgeItem.title}</p> : null}
          <div className="nfy-acts">
            {nudgeItem && steers && nudgeItem.status !== "covered" && nudgeItem.status !== "skipped" ? (
              <button
                type="button"
                className="nfy-act tap"
                disabled={busy.has(nudgeItem.id)}
                onClick={() => {
                  void mark(nudgeItem, "covered");
                  onDismissNudge(nudge.id);
                }}
              >
                Mark covered
              </button>
            ) : null}
            <button type="button" className="nfy-act is-quiet tap" onClick={() => onDismissNudge(nudge.id)}>
              Dismiss
            </button>
            {nudges.queue.length > 0 ? (
              <span className="agenda-more">{nudges.queue.length} more waiting</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {!agenda.loaded ? (
        <div className="agenda-loading" aria-busy="true">
          <span className="sr-only">Loading the agenda</span>
          <i aria-hidden="true"></i>
          <i aria-hidden="true"></i>
        </div>
      ) : total === 0 ? (
        <p className="agent-quiet">
          {steers
            ? "This meeting has no agenda. Add one from the meeting page and the meeting agent tracks it here."
            : "This meeting has no agenda."}
        </p>
      ) : (
        <ol className="agenda-list" aria-live="polite" aria-relevant="text">
          {agenda.items.map((item) => {
            const SIcon = STATUS_ICON[item.status];
            const meta = itemMeta(item, nameOf);
            const source = statusSourceText(item);
            const finished = item.status === "covered" || item.status === "skipped";
            const isBusy = busy.has(item.id);
            return (
              <li key={item.id} className={`agenda-item is-${item.status}`}>
                <span className="agenda-ico" aria-hidden="true">
                  <SIcon size={18} weight={item.status === "covered" ? "fill" : "regular"} />
                </span>
                <div className="agenda-body">
                  <p className="agenda-title">
                    {item.title}
                    <span className="sr-only">, {STATUS_LABEL[item.status]}</span>
                  </p>
                  <p className="agenda-meta">
                    <span className={`agenda-status is-${item.status}`} aria-hidden="true">
                      {STATUS_LABEL[item.status]}
                    </span>
                    {meta ? <span>{meta}</span> : null}
                  </p>
                  {item.agent_note ? (
                    <p className="agenda-note">
                      <Sparkle size={12} aria-hidden="true" />
                      <span>
                        <span className="sr-only">Meeting agent note: </span>
                        {item.agent_note}
                      </span>
                    </p>
                  ) : null}
                  {source ? <p className="agenda-src">{source}</p> : null}
                  {steers ? (
                    <div className="nfy-acts">
                      {finished ? (
                        <button
                          type="button"
                          className="nfy-act is-quiet tap"
                          disabled={isBusy}
                          aria-label={`Reopen ${item.title}`}
                          onClick={() => void mark(item, "pending")}
                        >
                          Reopen
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="nfy-act tap"
                            disabled={isBusy}
                            aria-label={`Mark ${item.title} covered`}
                            onClick={() => void mark(item, "covered")}
                          >
                            Covered
                          </button>
                          <button
                            type="button"
                            className="nfy-act is-quiet tap"
                            disabled={isBusy}
                            aria-label={`Skip ${item.title}`}
                            onClick={() => void mark(item, "skipped")}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {agenda.stale ? (
        <p className="agenda-stale" role="status">
          Couldn&rsquo;t refresh the agenda. Showing what was last loaded; it updates again when the connection recovers.
        </p>
      ) : null}
    </div>
  );
}
