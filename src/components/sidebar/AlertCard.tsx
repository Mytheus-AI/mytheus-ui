"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { CaretDown, Gauge, LinkBreak, PushPin, UserPlus, Warning, type Icon } from "@phosphor-icons/react";
import { dismissAlert, markAlertRead } from "@/app/actions/notifications";
import { ALERT_LABEL, alertHref, relatedLink, type Alert, type AlertType } from "@/lib/realtime/alerts";

/* ProactiveAgent alerts (Phase P11, plan 3.9; P11 contract section 5), private to this
   participant. Priority 1 (a conflict) is the red banner pinned above every card; workload and
   dependency are yellow cards, a missing stakeholder is a blue card. Each shows the title, the
   body, an expandable "Why", the related decisions, actions and people as chips, and Mark read /
   Dismiss. Mark read keeps it here, quieter; Dismiss removes it for good. Neither commits
   anything or tells anyone. The cards reserve their height so the panel does not jump. */

export type AlertOutcome = "read" | "dismissed" | "gone";

const ICON: Record<AlertType, Icon> = {
  conflict: Warning,
  workload: Gauge,
  dependency: LinkBreak,
  missing_stakeholder: UserPlus,
};

const PRIORITY_META: Record<Alert["priority"], string> = { 1: "act now", 2: "attention", 3: "info" };

function useAlertActions(alert: Alert, onResolved: (o: AlertOutcome) => void, onError: (m: string) => void) {
  const [busy, setBusy] = useState<null | "read" | "dismissed">(null);
  const run = async (verb: "read" | "dismissed") => {
    setBusy(verb);
    const res = verb === "read" ? await markAlertRead(alert.id) : await dismissAlert(alert.id);
    setBusy(null);
    if (res.ok) return onResolved(verb);
    onError(res.message);
    if (res.gone) onResolved("gone");
  };
  return { busy, run };
}

function AlertDetails({ alert }: { alert: Alert }) {
  const [open, setOpen] = useState(false);
  const whyId = useId();
  const href = alertHref(alert);
  return (
    <>
      {alert.body ? <p className="alert-body">{alert.body}</p> : null}
      {alert.rationale ? (
        <div className="alert-why">
          <button
            type="button"
            className="alert-why-toggle tap"
            aria-expanded={open}
            aria-controls={whyId}
            onClick={() => setOpen((o) => !o)}
          >
            Why am I seeing this
            <CaretDown size={10} weight="bold" aria-hidden className={open ? "is-open" : undefined} />
          </button>
          <p id={whyId} className="alert-why-text" hidden={!open}>
            {alert.rationale}
          </p>
        </div>
      ) : null}
      {alert.related.length > 0 || href ? (
        <div className="nfy-cites">
          {alert.related.map((r) => {
            const { label, href: to } = relatedLink(r, alert);
            return (
              <Link key={`${r.kind}-${r.id}`} href={to} target="_blank" rel="noopener" className="cite-chip tap">
                {label}
              </Link>
            );
          })}
          {href ? (
            <Link href={href} target="_blank" rel="noopener" className="cite-chip tap">
              Open
            </Link>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Actions({
  alert,
  busy,
  run,
}: {
  alert: Alert;
  busy: null | "read" | "dismissed";
  run: (verb: "read" | "dismissed") => Promise<void>;
}) {
  return (
    <div className="nfy-acts">
      {alert.status === "read" ? null : (
        <button type="button" className="nfy-act tap" disabled={busy !== null} onClick={() => void run("read")}>
          {busy === "read" ? "Marking..." : "Mark read"}
        </button>
      )}
      <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("dismissed")}>
        {busy === "dismissed" ? "Dismissing..." : "Dismiss"}
      </button>
    </div>
  );
}

/** The red banner for a priority-1 alert. Pinned (sticky) above every card in the panel. */
export function AlertBanner({
  alert,
  leaving,
  onResolved,
  onError,
}: {
  alert: Alert;
  leaving: boolean;
  onResolved: (outcome: AlertOutcome) => void;
  onError: (message: string) => void;
}) {
  const { busy, run } = useAlertActions(alert, onResolved, onError);
  const read = alert.status === "read";
  return (
    <div
      className={`conflict-banner alert-banner${read ? " is-read" : ""}${leaving ? " is-leaving" : ""}`}
      role={read ? undefined : "alert"}
      data-alert-id={alert.id}
    >
      <div className="cbn-kind">
        <Warning size={12} weight="bold" aria-hidden />
        {ALERT_LABEL[alert.alertType]}
        <span className="cbn-meta">
          <PushPin size={11} weight="fill" aria-hidden />
          {read ? "read" : "pinned"}
        </span>
      </div>
      <p className="cbn-text alert-title">{alert.title}</p>
      <AlertDetails alert={alert} />
      <Actions alert={alert} busy={busy} run={run} />
    </div>
  );
}

/** A yellow (workload, dependency) or blue (missing stakeholder) alert card. */
export function AlertCard({
  alert,
  leaving,
  onResolved,
  onError,
}: {
  alert: Alert;
  leaving: boolean;
  onResolved: (outcome: AlertOutcome) => void;
  onError: (message: string) => void;
}) {
  const { busy, run } = useAlertActions(alert, onResolved, onError);
  const KindIcon = ICON[alert.alertType];
  const read = alert.status === "read";
  return (
    <div
      className={`nfy-card is-alert is-alert-${alert.alertType} is-p${alert.priority} is-new${read ? " is-read" : ""}${leaving ? " is-leaving" : ""}`}
      data-alert-id={alert.id}
    >
      <div className="nfy-kind">
        <KindIcon size={12} weight="bold" aria-hidden />
        {ALERT_LABEL[alert.alertType]} <span className="nfy-meta">{read ? "read" : PRIORITY_META[alert.priority]}</span>
      </div>
      <p className="nfy-text alert-title">{alert.title}</p>
      <AlertDetails alert={alert} />
      <Actions alert={alert} busy={busy} run={run} />
    </div>
  );
}
