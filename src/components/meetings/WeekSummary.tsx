import { addDays, mondayOf, shortDate, startOfDay } from "./date-utils";
import type { HubMeeting } from "./types";

/* "This week" card: Monday to Sunday around today, counted from the meetings the hub holds. Every
   figure is a plain count or sum of real fields. Confirmed-versus-unconfirmed is not shown because
   nothing in the app records it yet. */
export function WeekSummary({ meetings, today }: { meetings: HubMeeting[]; today: Date }) {
  const mon = mondayOf(today);
  const sun = addDays(mon, 6);
  const inWeek = meetings.filter((m) => {
    const d = startOfDay(new Date(m.startTime));
    return d >= mon && d <= sun;
  });
  const held = inWeek.filter((m) => m.status === "past");
  const ahead = inWeek.filter((m) => m.status === "upcoming");
  const live = inWeek.filter((m) => m.status === "live");
  const mins = held.reduce((a, m) => a + m.durationMinutes, 0);
  const decisions = held.reduce((a, m) => a + m.decisionCount, 0);
  const actions = held.reduce((a, m) => a + m.actionCount, 0);

  const items: { label: string; value: string; unit?: string }[] = [
    { label: "Meetings held", value: String(held.length) },
    { label: "Still ahead", value: String(ahead.length) },
    { label: "Live now", value: String(live.length) },
    { label: "Time in meetings", value: (mins / 60).toFixed(1), unit: "hrs" },
    { label: "Decisions captured", value: String(decisions) },
    { label: "Actions captured", value: String(actions) },
  ];

  return (
    <section className="rounded-card border border-line bg-surface p-5" aria-label="This week">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">This week</h2>
        <span className="text-[12.5px] text-ink-3">
          {shortDate(mon)} to {shortDate(sun)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-[12.5px] text-ink-3">{it.label}</dt>
            <dd className="text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink">
              {it.value}
              {it.unit ? (
                <small className="ml-1 text-[13px] font-semibold tracking-normal text-ink-3">
                  {it.unit}
                </small>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
