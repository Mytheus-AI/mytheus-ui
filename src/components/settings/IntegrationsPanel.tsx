import type { Icon } from "@phosphor-icons/react";
import { CalendarDots, Kanban, SlackLogo, SquaresFour } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Note } from "./primitives";

/* Integration connections, the deliberately small surface (guardrail R8): Google Calendar and
   Slack, plus ONE project tracker (Jira or Linear) per workspace. `integration-service` serves
   no routes yet (no OAuth flow, no stored connection), so nothing can be connected and nothing
   is shown as connected. Each card says what it will do and that it is not available yet. */

type Integration = { key: string; name: string; description: string; icon: Icon; tracker?: boolean };

const INTEGRATIONS: Integration[] = [
  {
    key: "google_calendar",
    name: "Google Calendar",
    description: "Meetings sync from your calendar so agents can prepare before you join.",
    icon: CalendarDots,
  },
  {
    key: "slack",
    name: "Slack",
    description: "Confirmed decisions and action items go to the right channel.",
    icon: SlackLogo,
  },
  {
    key: "linear",
    name: "Linear",
    description: "Confirmed action items become issues in your team's tracker.",
    icon: Kanban,
    tracker: true,
  },
  {
    key: "jira",
    name: "Jira",
    description: "Confirmed action items become Jira issues. One tracker per workspace.",
    icon: SquaresFour,
    tracker: true,
  },
];

export function IntegrationsPanel() {
  return (
    <>
      <Note>
        Integrations are not connected yet. When they are, one project tracker can be connected per workspace, and only
        action items someone has confirmed will sync to it.
      </Note>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
        {INTEGRATIONS.map(({ key, name, description, icon: Glyph, tracker }) => (
          <li
            key={key}
            className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:px-[22px]"
          >
            <div className="flex items-start gap-3.5">
              <span
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink"
                aria-hidden="true"
              >
                <Glyph size={24} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] font-semibold leading-snug text-ink">{name}</h3>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>Not available yet</Badge>
              {tracker ? <Badge tone="low">Project tracker</Badge> : null}
            </div>
            <div className="mt-auto border-t border-line pt-4">
              <Button variant="outline" size="sm" disabled aria-label={`Connect ${name}, not available yet`}>
                Connect
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
