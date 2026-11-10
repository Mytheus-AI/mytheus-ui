"use client";

import { useState, useTransition } from "react";
import { setAgentCollaboration } from "@/app/actions/agent-collaboration";
import type { CollaborationLevel, CurrentLevel } from "@/lib/agent-collaboration";
import { Button } from "@/components/ui/Button";
import { Note, SaveStatus, focusPill } from "@/components/settings/primitives";

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
      setMessage(
        res.ok
          ? { tone: "info", text: "Level saved. New requests follow it within a minute." }
          : { tone: "error", text: res.message },
      );
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <fieldset className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 sm:px-[22px] md:py-[18px]">
        <legend className="sr-only">Agent collaboration level</legend>
        {OPTIONS.map((o) => {
          const on = choice === o.value;
          return (
            <label
              key={o.value}
              className={`relative flex cursor-pointer items-start gap-3 rounded-ctl border px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                on
                  ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]"
                  : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
              }`}
            >
              <input
                type="radio"
                name="agent-collaboration"
                value={o.value}
                checked={on}
                onChange={() => setChoice(o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
                  on ? "border-signal" : "border-ink-3"
                }`}
              >
                {on ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                  {o.label}
                  {current === o.value ? (
                    <span className="rounded-full bg-bg-2 px-2 py-px text-[12.5px] font-semibold text-ink-2">Current</span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-3">{o.help}</span>
              </span>
            </label>
          );
        })}
      </fieldset>

      {current === "custom" ? (
        <div className="px-4 pb-4 sm:px-[22px]">
          <Note tone="warning">
            This workspace has grants that match none of these options. Picking one replaces them with that option&apos;s
            grants.
          </Note>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
        <Button type="submit" disabled={!dirty || pending} className={focusPill}>
          {pending ? "Saving level" : "Save level"}
        </Button>
        <SaveStatus tone={message ? (message.tone === "error" ? "error" : "ok") : undefined}>{message?.text ?? ""}</SaveStatus>
      </div>
    </form>
  );
}
