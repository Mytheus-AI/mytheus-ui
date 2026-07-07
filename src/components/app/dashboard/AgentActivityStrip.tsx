import Link from "next/link";

/* What your personal agent did recently — a calm, one-line-per-item strip.
   Local const until /bff/dashboard exposes an agent-activity feed; each item
   maps to real mock records (mockDecisions, mockMeetingDetails recaps,
   mockMeetingDetails agendas). */

type AgentActivity = {
  id: string;
  text: string;
  href: string;
};

const agentActivity: AgentActivity[] = [
  {
    id: "aa_1",
    text: "Prepped agenda context for Q3 Roadmap Sync",
    href: "/meetings/mtg_1",
  },
  {
    id: "aa_2",
    text: "Drafted the recap for Vendor Call — Deepgram Renewal",
    href: "/meetings/mtg_4",
  },
  {
    id: "aa_3",
    text: "Captured 2 decisions in Investor Update — June",
    href: "/decisions",
  },
];

export function AgentActivityStrip() {
  return (
    <section
      aria-label="Your agent's recent activity"
      className="rounded-card border border-line bg-surface px-5 py-2.5"
    >
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-8">
        <p className="kicker shrink-0 py-2 text-[9.5px]">Your agent</p>
        <ul className="flex min-w-0 flex-1 flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          {agentActivity.map((item) => (
            <li key={item.id} className="min-w-0">
              <Link
                href={item.href}
                className="group flex min-h-[40px] min-w-0 items-center gap-2.5"
                title={item.text}
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
                />
                <span className="truncate text-[13px] text-ink-2 transition-colors duration-150 group-hover:text-ink">
                  {item.text}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
