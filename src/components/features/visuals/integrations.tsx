import type { ReactNode } from "react";
import { CalendarBlank, Hash, Kanban } from "@phosphor-icons/react/dist/ssr";
import { Chip, Win, WinBar } from "@/components/site/Section";
import { APPEAR, Demo, PanelLabel, dl } from "@/components/features/atoms";

/* Integrations: the workspace's connections as aligned rows (what each does, its state), with
   Jira shown as the alternative to Linear because a workspace connects one tracker. Below, the
   delivery log; when the window scrolls in, the newest delivery arrives. Generic Phosphor icons
   stand in for the services: no third-party logos. */

const TOOLS: { icon: ReactNode; name: string; does: string; on: boolean }[] = [
  { icon: <CalendarBlank size={20} />, name: "Google Calendar", does: "Brings your meetings in, so your agent is ready before you join.", on: true },
  { icon: <Hash size={20} />, name: "Slack", does: "Sends confirmed decisions and tasks to #launch and to owners by DM.", on: true },
  { icon: <Kanban size={20} />, name: "Linear", does: "Turns confirmed action items into issues.", on: true },
  { icon: <Kanban size={20} />, name: "Jira", does: "One tracker per workspace. Disconnect Linear to switch.", on: false },
];

const LOG: { what: string; where: string; when: string; fresh?: boolean }[] = [
  { what: "Task “Book QA for two extra days”", where: "Created in Linear", when: "11:07", fresh: true },
  { what: "Decision “Pricing locked at $49”", where: "Sent to #launch", when: "11:06" },
];

export function IntegrationsVisual() {
  return (
    <Win
      className="mx-auto max-w-[920px]"
      label="Workspace integrations. Google Calendar, Slack and Linear are connected; Jira is available as the alternative, since a workspace connects one tracker. The delivery log shows a confirmed decision sent to the launch channel in Slack and a confirmed task created in Linear."
    >
      <WinBar title="Integrations" meta="Workspace settings" right={<Chip>3 connected</Chip>} />
      <ul className="px-[22px] py-2">
        {TOOLS.map((t) => (
          <li
            key={t.name}
            className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1.5 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[40px_minmax(0,1fr)_auto]"
          >
            <span
              aria-hidden
              className={`grid h-10 w-10 place-items-center rounded-ctl ${t.on ? "bg-bg-2 text-ink-2" : "border border-line-2 text-ink-4"}`}
            >
              {t.icon}
            </span>
            <div className="min-w-0">
              <p className={`font-semibold ${t.on ? "text-ink" : "text-ink-3"}`}>{t.name}</p>
              <p className="text-[14px] leading-[1.4] text-ink-3">{t.does}</p>
            </div>
            <span className="col-start-2 sm:col-start-3">
              {t.on ? <Chip tone="ok">Connected</Chip> : <Chip>Available</Chip>}
            </span>
          </li>
        ))}
      </ul>
      <Demo className="border-t border-line bg-surface-2 px-[22px] py-5">
        <PanelLabel className="!mb-1.5">Recent deliveries, after confirm</PanelLabel>
        <ul>
          {LOG.map((l) => (
            <li
              key={l.when}
              style={l.fresh ? dl(0.9) : undefined}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-t border-line py-2.5 first:border-t-0 ${l.fresh ? APPEAR : ""}`}
            >
              <p className="text-[15px] leading-[1.4] text-ink">
                {l.what}
                <span className="text-ink-3">. {l.where}.</span>
              </p>
              <span className="text-[14px] tabular-nums text-ink-3">{l.when}</span>
            </li>
          ))}
        </ul>
      </Demo>
    </Win>
  );
}
