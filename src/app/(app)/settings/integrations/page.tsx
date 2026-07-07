"use client";

import { useState } from "react";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { mockIntegrations } from "@/lib/mock/data";

/* Integration connections — the deliberately small surface (guardrail R8):
   Google Calendar + Slack, plus ONE project tracker (Jira or Linear) per
   workspace. Connect/disconnect toggles are visual only until the
   integration-service wiring lands. */

export default function IntegrationsSettingsPage() {
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <div>
        <p className="kicker mb-2">Settings</p>
        <h1 className="text-[28px] font-medium tracking-tight text-ink-display">
          Integrations
        </h1>
      </div>

      <SettingsTabs />

      <div className="flex flex-col gap-4">
        {mockIntegrations.map((integration) => {
          const isOn = !!connected[integration.key];
          const isTracker = integration.key === "jira" || integration.key === "linear";
          return (
            <Card key={integration.key}>
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-signal-soft font-mono text-[13px] font-bold text-signal-deep">
                  {integration.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-[10rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-medium text-ink">{integration.name}</p>
                    {isOn ? (
                      <Badge tone="success">Connected</Badge>
                    ) : (
                      <Badge tone="default">Available</Badge>
                    )}
                    {isTracker && <Badge tone="default">Tracker</Badge>}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                    {integration.description}
                  </p>
                  {isOn && integration.account && (
                    <p className="mt-2 font-mono text-[11px] text-ink-3">
                      {integration.account}
                    </p>
                  )}
                </div>
                <Button
                  variant={isOn ? "outline" : "primary"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => toggle(integration.key)}
                >
                  {isOn ? "Disconnect" : "Connect"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-3">
        One project tracker per workspace{trackerConnected ? " — connecting the other one switches over" : ""}.
        Confirmed action items become issues in whichever tracker is connected;
        nothing syncs before your confirm.
      </p>
    </div>
  );
}
