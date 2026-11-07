"use client";

import { useState } from "react";
import type { Icon } from "@phosphor-icons/react";
import { CalendarDots, GoogleLogo, Kanban, SlackLogo, SquaresFour } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { mockIntegrations, type IntegrationConnection } from "@/lib/mock/data";
import { focusPill } from "./primitives";

/* Integration connections, the deliberately small surface (guardrail R8): Google Calendar and
   Slack, plus ONE project tracker (Jira or Linear) per workspace. Connect and disconnect are
   visual only until the integration-service wiring lands. */

const iconFor: Record<IntegrationConnection["key"], Icon> = {
  google_calendar: CalendarDots,
  slack: SlackLogo,
  linear: Kanban,
  jira: SquaresFour,
};

export function IntegrationsPanel() {
  const [connected, setConnected] = useState<Record<string, boolean>>(
    Object.fromEntries(mockIntegrations.map((i) => [i.key, i.status === "connected"])),
  );

  const trackerConnected = connected.jira || connected.linear;

  const toggle = (key: string) => {
    setConnected((c) => {
      const next = { ...c, [key]: !c[key] };
      // one tracker per workspace: connecting one disconnects the other
      if (key === "jira" && next.jira) next.linear = false;
      if (key === "linear" && next.linear) next.jira = false;
      return next;
    });
  };

  return (
    <>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,290px),1fr))] gap-5">
        {mockIntegrations.map((integration) => {
          const isOn = !!connected[integration.key];
          const isTracker = integration.key === "jira" || integration.key === "linear";
          const Glyph = iconFor[integration.key] ?? GoogleLogo;
          return (
            <li
              key={integration.key}
              className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-sm"
            >
              <div className="flex items-start gap-3.5">
                <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-pill bg-bg-2 text-ink">
                  <Glyph size={24} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-semibold text-ink">{integration.name}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {isOn ? <Badge tone="success">Connected</Badge> : <Badge>Available</Badge>}
                    {isTracker ? <Badge>Tracker</Badge> : null}
                  </div>
                </div>
              </div>
              <p className="text-[13.5px] text-ink-3">{integration.description}</p>
              {isOn && integration.account ? (
                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-pill border border-line bg-bg px-3.5 py-3 text-[13px]">
                  <dt className="text-ink-3">Account</dt>
                  <dd className="text-right font-semibold text-ink [overflow-wrap:anywhere]">
                    {integration.account}
                  </dd>
                </dl>
              ) : null}
              <div className="mt-auto">
                <Button
                  variant={isOn ? "outline" : "secondary"}
                  size="sm"
                  aria-label={`${isOn ? "Disconnect" : "Connect"} ${integration.name}`}
                  className={`active:opacity-80 ${focusPill}`}
                  onClick={() => toggle(integration.key)}
                >
                  {isOn ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="max-w-[70ch] text-[13px] text-ink-3" role="status">
        One project tracker per workspace
        {trackerConnected ? ", so connecting the other one switches over" : ""}. Confirmed action
        items become issues in whichever tracker is connected; nothing syncs before you confirm.
      </p>
    </>
  );
}
