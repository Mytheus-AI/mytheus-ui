"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppWindow,
  ArrowSquareOut,
  ArrowsCounterClockwise,
  Browser,
  ChatCircleText,
  SlackLogo,
  X,
  type Icon,
} from "@phosphor-icons/react";
import { dismissChallenge } from "@/app/actions/decision-challenges";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Card";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalWhen } from "@/components/status/LocalWhen";
import { AskToReopen, ReopenAnswer, ReopenMine } from "@/components/decisions/ReopenRequests";
import type {
  ChallengeSource,
  ChallengeStatus,
  DecisionChallenge,
  DecisionChallenges as DecisionChallengesData,
  ReopenRequest,
} from "@/lib/api/decision-challenges-types";
import {
  CHALLENGE_STATUS_LABEL,
  REOPEN_STATUS_LABEL,
  SOURCE_LABEL,
  canDismiss,
  challengedHeading,
  externalLink,
  orderChallenges,
  orderReopenRequests,
  placeOf,
} from "@/lib/decision-challenges";
import { graceful } from "@/lib/toast";

/* "Decisions that follow you" on the decision page: everywhere this decision was challenged
   (Slack, a doc, an email, an AI assistant) and the requests to reopen it.

   The owner answers a request in place (a revisit meeting or a follow-up task, or decline); the
   person who asked can withdraw; anyone else who can see the decision can ask. The writer of a
   challenge, or the owner, can dismiss it with Undo. `?reopen=<id>` (the Inbox link) scrolls to
   that request and moves focus to it. */

const SOURCE_ICON: Record<ChallengeSource, Icon> = {
  slack: SlackLogo,
  extension: Browser,
  mcp: ChatCircleText,
  app: AppWindow,
};

const STATUS_TONE: Record<ChallengeStatus, ChipTone> = { open: "medium", reopened: "low", dismissed: "outline" };

export function DecisionChallenges({
  data,
  decisionId,
  meetingId,
  superseded,
  focusReopenId,
  nowIso,
}: {
  data: DecisionChallengesData;
  decisionId: string;
  meetingId: string;
  superseded: boolean;
  focusReopenId?: string | null;
  nowIso: string;
}) {
  const [challenges, setChallenges] = useState<DecisionChallenge[]>(data.items);
  const [requests, setRequests] = useState<ReopenRequest[]>(data.reopen_requests);
  useEffect(() => setChallenges(data.items), [data.items]);
  useEffect(() => setRequests(data.reopen_requests), [data.reopen_requests]);

  const ordered = useMemo(() => orderChallenges(challenges), [challenges]);
  const orderedRequests = useMemo(() => orderReopenRequests(requests), [requests]);
  const live = challenges.filter((c) => c.status !== "dismissed");
  const places = new Set(live.map((c) => placeOf(c).toLowerCase())).size;
  const heading = challengedHeading(places, live.length);
  const mineWaiting = requests.some((r) => r.viewer_role === "requester" && r.status === "pending");
  const canAsk = !data.viewer_is_owner && !superseded && !mineWaiting;

  useEffect(() => {
    if (!focusReopenId) return;
    const el = document.getElementById(`reopen-${focusReopenId}`);
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    el.focus({ preventScroll: true });
  }, [focusReopenId]);

  const setStatus = (id: string, status: ChallengeStatus) =>
    setChallenges((list) => list.map((c) => (c.id === id ? { ...c, status } : c)));

  const dismiss = (c: DecisionChallenge) =>
    graceful({
      message: "Challenge dismissed",
      apply: () => setStatus(c.id, "dismissed"),
      revert: () => setStatus(c.id, c.status),
      commit: async () => {
        const res = await dismissChallenge(c.id, meetingId, decisionId);
        if (res.ok) {
          setChallenges((list) => list.map((x) => (x.id === c.id ? res.challenge : x)));
          return { ok: true };
        }
        return { ok: false, message: res.message, gone: res.gone };
      },
    });

  const replaceRequest = (next: ReopenRequest | null, id?: string) =>
    setRequests((list) => (next ? list.map((r) => (r.id === next.id ? next : r)) : list.filter((r) => r.id !== id)));

  const description =
    live.length > 0
      ? "Where people wrote something that goes against this decision or reopens it. Only you and people who can see the decision see this."
      : requests.length > 0
        ? "Nothing open goes against this decision right now."
        : undefined;

  return (
    <div id="challenges" className="scroll-mt-24">
      <SectionCard
        headingId="challenges-title"
        title={heading}
        description={description}
        aside={
          live.length > 0 ? (
            <Chip tone="medium" className="tabular-nums">
              {live.length} open
            </Chip>
          ) : undefined
        }
      >
        {ordered.length === 0 && orderedRequests.length === 0 ? (
          <EmptyState
            inCard
            compact
            art="decisions"
            title="No one has challenged this decision"
            description="When someone writes something that goes against it in Slack, a doc, an email or an AI assistant, it shows up here, with where and why."
          />
        ) : null}

        {ordered.length > 0 ? (
          <ul aria-label="Challenges" className="divide-y divide-line">
            {ordered.map((c) => (
              <ChallengeRow
                key={c.id}
                challenge={c}
                nowIso={nowIso}
                onDismiss={canDismiss(c, null, data.viewer_is_owner) ? () => dismiss(c) : undefined}
              />
            ))}
          </ul>
        ) : null}

        {orderedRequests.length > 0 ? (
          <div>
            <h3 className="bg-surface-2 px-4 py-2.5 text-[14px] font-semibold text-ink sm:px-[22px]">
              Requests to reopen
              <span className="ml-2 font-normal tabular-nums text-ink-3">{orderedRequests.length}</span>
            </h3>
            <ul aria-label="Requests to reopen" className="divide-y divide-line">
              {orderedRequests.map((r) => (
                <li
                  key={r.id}
                  id={`reopen-${r.id}`}
                  tabIndex={-1}
                  aria-current={r.id === focusReopenId ? "true" : undefined}
                  className={`px-4 py-4 outline-offset-[-2px] sm:px-[22px] ${r.id === focusReopenId ? "bg-surface-2" : ""}`}
                >
                  <RequestBody request={r} nowIso={nowIso} />
                  {r.viewer_role === "owner" ? (
                    <ReopenAnswer request={r} onChange={(next) => replaceRequest(next)} />
                  ) : r.viewer_role === "requester" ? (
                    <ReopenMine request={r} onChange={(next) => replaceRequest(next, r.id)} />
                  ) : (
                    <p className="mt-2">
                      <Chip tone={r.status === "pending" ? "medium" : r.status === "accepted" ? "ok" : "neutral"}>{REOPEN_STATUS_LABEL[r.status]}</Chip>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {canAsk ? (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-[22px]">
            <p className="max-w-[60ch] text-[14px] text-ink-3">
              Think this should change? Ask {data.owner?.name ?? "the owner"} to reopen it.
            </p>
            <AskToReopen
              decisionId={decisionId}
              meetingId={meetingId}
              ownerName={data.owner?.name ?? null}
              onAsked={(request) => setRequests((list) => [request, ...list.filter((x) => x.id !== request.id)])}
            />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

function ChallengeRow({ challenge: c, nowIso, onDismiss }: { challenge: DecisionChallenge; nowIso: string; onDismiss?: () => void }) {
  const Glyph = SOURCE_ICON[c.source] ?? AppWindow;
  const href = externalLink(c.link);
  const place = placeOf(c);
  const dismissed = c.status === "dismissed";
  return (
    <li className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-[22px]">
      <span aria-hidden className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-ctl bg-bg-2 ${dismissed ? "text-ink-4" : "text-ink-2"}`}>
        <Glyph size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
          <span className="font-semibold text-ink">{place}</span>
          <span className="sr-only">, on {SOURCE_LABEL[c.source]}</span>
          {c.author?.name ? <span className="text-ink-3">{c.author.name}</span> : null}
          <span className="text-[12.5px] text-ink-3">
            <LocalWhen iso={c.created_at} nowIso={nowIso} mode="past" />
          </span>
          <Chip tone={STATUS_TONE[c.status]}>{CHALLENGE_STATUS_LABEL[c.status]}</Chip>
        </p>
        <blockquote
          className={`mt-2 max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px] italic leading-snug ${
            dismissed ? "text-ink-3" : "text-ink-2"
          }`}
        >
          {c.quote}
        </blockquote>
        {c.why ? (
          <p className="mt-1.5 max-w-[75ch] text-[14px] leading-relaxed text-ink-3">
            <span className="font-semibold text-ink-2">{c.relation === "reopens" ? "Reopens it: " : "Goes against it: "}</span>
            {c.why}
          </p>
        ) : null}
        {href || onDismiss ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline"
              >
                Open in {SOURCE_LABEL[c.source] === "Mytheus" ? "a new tab" : SOURCE_LABEL[c.source]}
                <ArrowSquareOut size={13} aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
            {onDismiss ? (
              <Button variant="ghost" size="sm" onClick={onDismiss} aria-label={`Dismiss the challenge from ${place}`}>
                <X size={14} aria-hidden />
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function RequestBody({ request: r, nowIso }: { request: ReopenRequest; nowIso: string }) {
  const href = externalLink(r.link);
  return (
    <>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px]">
        <ArrowsCounterClockwise size={15} className="text-ink-3" aria-hidden />
        <span className="font-semibold text-ink">{r.requested_by.name || "Someone"} asked to reopen it</span>
        {r.place_label ? <span className="text-ink-3">from {r.place_label}</span> : null}
        <span className="text-[12.5px] text-ink-3">
          <LocalWhen iso={r.created_at} nowIso={nowIso} mode="past" />
        </span>
      </p>
      {r.quote ? (
        <blockquote className="mt-2 max-w-[75ch] rounded-ctl bg-bg-2 px-3.5 py-2.5 font-display text-[15px] italic leading-snug text-ink-2">
          {r.quote}
        </blockquote>
      ) : null}
      {r.reason ? <p className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed text-ink-2">{r.reason}</p> : null}
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline"
        >
          See where it was written
          <ArrowSquareOut size={13} aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : null}
    </>
  );
}
