import Link from "next/link";
import { ArrowRight, CheckCircle, EyeSlash, Lightning } from "@phosphor-icons/react/dist/ssr";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip, Count } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Settlement } from "@/lib/api/why-blast-types";
import { dayLabel } from "@/lib/decision-why";
import { STATUS_CHIP, ownerName } from "@/lib/settlements";

/* My work, To settle: every thread where one of your decisions may clash with another team's,
   open ones first. Server component; each row opens its thread. */

function Row({ s }: { s: Settlement }) {
  const chip = STATUS_CHIP[s.status];
  return (
    <li>
      <Link
        href={`/work/settle/${s.id}`}
        className="group grid gap-x-5 gap-y-2 px-4 py-[18px] transition-colors duration-150 hover:bg-surface-2 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
      >
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink-3">Your decision</span>
          <span className="mt-0.5 block text-[15px] font-semibold leading-snug text-ink">{s.mine.content ?? "Your decision"}</span>
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-ink-3">
            {ownerName(s.theirs).replace(/^the/, "The")}&rsquo;s{s.theirs.team ? `, ${s.theirs.team}` : ""}
          </span>
          {s.theirs.visible && s.theirs.content ? (
            <span className="mt-0.5 block text-[15px] leading-snug text-ink-2">{s.theirs.content}</span>
          ) : (
            <span className="mt-0.5 flex items-center gap-1.5 text-[15px]  leading-snug text-ink-3">
              <EyeSlash size={15} aria-hidden className="shrink-0" />
              Wording not shared
            </span>
          )}
        </span>
        <span className="flex items-center gap-3 md:flex-col md:items-end md:gap-1.5">
          <Chip tone={chip.tone} icon={s.status === "open" ? <Lightning size={13} weight="bold" /> : <CheckCircle size={13} weight="fill" />}>
            {chip.label}
          </Chip>
          <span className="text-[13px] text-ink-3">{dayLabel(s.created_at)}</span>
          <ArrowRight size={16} aria-hidden className="ml-auto text-ink-3 transition-transform duration-150 motion-safe:group-hover:translate-x-0.5 md:hidden" />
        </span>
      </Link>
    </li>
  );
}

export function SettleList({ items }: { items: Settlement[] }) {
  const open = items.filter((s) => s.status === "open");
  const done = items.filter((s) => s.status !== "open");
  if (items.length === 0) {
    return (
      <EmptyState
        art="decisions"
        title="Nothing to settle"
        description="When your Myte sees that one of your decisions may clash with another team's, it opens a thread here for you and that decision's owner."
      />
    );
  }
  return (
    <div className="space-y-5">
      <section aria-labelledby="settle-open-h" className={cardClass({ flush: true })}>
        <CardHead
          id="settle-open-h"
          title="To settle"
          description={open.length ? "Talk it through, then keep both, let one stand, or meet." : "Nothing waiting on you."}
          right={open.length ? <Count n={open.length} label="to settle" tone="medium" /> : undefined}
          divided={open.length > 0}
        />
        {open.length ? (
          <ul className="divide-y divide-line">
            {open.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </ul>
        ) : null}
      </section>
      {done.length ? (
        <section aria-labelledby="settle-done-h" className={cardClass({ flush: true })}>
          <CardHead id="settle-done-h" title="Settled" right={<Count n={done.length} label="settled" />} divided />
          <ul className="divide-y divide-line">
            {done.map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
