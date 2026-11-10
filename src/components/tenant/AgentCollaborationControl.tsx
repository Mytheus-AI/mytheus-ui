"use client";

import { useState, useTransition } from "react";
import { setAgentCollaboration } from "@/app/actions/agent-collaboration";
import type { CollaborationLevel, CurrentLevel } from "@/lib/agent-collaboration";
import { Button } from "@/components/ui/Button";
import { Note } from "@/components/settings/primitives";

/* The workspace's "Agent collaboration" level: how far one person's agent may ask another
   person's agent for context during a meeting. One choice, saved with one button; the server
   action turns it into grant changes on identity-tenant-service. */

const OPTIONS: { value: CollaborationLevel; label: string; help: string }[] = [
  { value: "off", label: "Off", help: "Agents never ask each other. Each agent only uses its own person's knowledge base." },
  { value: "same_team", label: "Same team", help: "An agent may ask the agents of people on the same team." },
  { value: "department", label: "Department", help: "An agent may ask the agents of people in the same department, teams included." },
  { value: "org", label: "Whole org", help: "An agent may ask the agent of anyone in this workspace." },
];

export function AgentCollaborationControl({ current }: { current: CurrentLevel }) {
  const [choice, setChoice] = useState<CollaborationLevel | null>(current === "custom" ? null : current);
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = choice !== null && choice !== current;

  const save = () => {
    if (!choice) return;
    setMessage(null);
    startTransition(async () => {
      const res = await setAgentCollaboration(choice);
      setMessage(res.ok ? { tone: "info", text: "Saved. New requests follow this setting within a minute." } : { tone: "error", text: res.message });
    });
  };

  return (
    <form
      className="flex flex-col gap-4 px-4 py-4 sm:px-[22px] sm:py-[18px]"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Agent collaboration level</legend>
        {OPTIONS.map((o) => {
          const on = choice === o.value;
          return (
            <label
              key={o.value}
              className={`flex cursor-pointer items-start gap-3 rounded-card border px-4 py-3 transition-colors duration-150 ${
                on ? "border-signal bg-bg" : "border-line hover:bg-bg"
              }`}
            >
              <input
                type="radio"
                name="agent-collaboration"
                value={o.value}
                checked={on}
                onChange={() => setChoice(o.value)}
                className="mt-1 accent-[var(--signal)]"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink">
                  {o.label}
                  {current === o.value ? <span className="ml-2 text-[12.5px] font-normal text-ink-3">(current)</span> : null}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-ink-3">{o.help}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {current === "custom" ? (
        <Note tone="warning">
          This workspace has grants that match none of these options. Picking one replaces them with that option&apos;s grants.
        </Note>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!dirty || pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
        {message ? (
          <span role="status" className={`text-[13px] ${message.tone === "error" ? "text-priority-high" : "text-ink-3"}`}>
            {message.text}
          </span>
        ) : null}
      </div>
    </form>
  );
}
