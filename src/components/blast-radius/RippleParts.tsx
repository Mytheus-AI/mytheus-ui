"use client";

import {
  ArrowsClockwise,
  CalendarBlank,
  CheckSquare,
  CurrencyCircleDollar,
  EyeSlash,
  Handshake,
  Lightning,
  LockOpen,
  Prohibit,
  Scales,
  Storefront,
  Target,
  TrendUp,
  WarningCircle,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { LinkButton } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import type { RippleEffect, RippleItem, RippleKind } from "@/lib/api/why-blast-types";
import { EFFECT, KIND_NOUN, effectPhrase, itemLabel, type EffectTone } from "@/lib/blast-radius";
import { dayLabel } from "@/lib/decision-why";

/* The pieces the ripple map and the ring-by-ring list share: an item's face (its effect icon in
   the frozen colour, and its label), and the detail of one item. */

export const EFFECT_ICON: Record<RippleEffect, Icon> = {
  changes: ArrowsClockwise,
  blocks: Prohibit,
  unblocks: LockOpen,
  advances: TrendUp,
  risks: WarningCircle,
  contradicts: Lightning,
  commits: Handshake,
};

export const KIND_ICON: Record<RippleKind, Icon> = {
  action: CheckSquare,
  goal: Target,
  decision: Scales,
  customer_action: Storefront,
  deal: CurrencyCircleDollar,
};

export const TONE_CLASS: Record<EffectTone, string> = {
  attention: "bg-priority-medium-soft text-priority-medium",
  ok: "bg-ok-soft text-ok",
  info: "bg-bg-2 text-ink-2",
};

const CHIP_TONE: Record<EffectTone, ChipTone> = { attention: "medium", ok: "ok", info: "neutral" };

export function EffectDot({ effect, size = 28 }: { effect: RippleEffect; size?: number }) {
  const I = EFFECT_ICON[effect];
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`grid shrink-0 place-items-center rounded-full ${TONE_CLASS[EFFECT[effect].tone]}`}
    >
      <I size={Math.round(size * 0.52)} weight="bold" />
    </span>
  );
}

/** The accessible name of a node: what it is, then what the decision does to it. */
export function nodeName(item: RippleItem): string {
  const due = item.due ? `, due ${dayLabel(item.due)}` : "";
  return `${itemLabel(item)}. ${effectPhrase(item)}${due}.`;
}

const OPEN_LABEL: Record<RippleKind, string> = {
  action: "Open task",
  goal: "Open goal",
  decision: "Open decision",
  customer_action: "Open task",
  deal: "Open deal",
};

/** One item in full: what it is, the effect, why, who owns it, when it is due, and where to go. */
export function RippleDetail({ item, headingLevel = 3, hideTitle = false }: { item: RippleItem; headingLevel?: 3 | 4; hideTitle?: boolean }) {
  const KindIcon = KIND_ICON[item.kind];
  const EffectIcon = EFFECT_ICON[item.effect];
  const tone = EFFECT[item.effect].tone;
  const H = headingLevel === 3 ? "h3" : "h4";
  const noun = KIND_NOUN[item.kind];
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="outline" icon={<KindIcon size={13} />}>
          {noun.charAt(0).toUpperCase() + noun.slice(1)}
        </Chip>
        <Chip tone={CHIP_TONE[tone]} icon={<EffectIcon size={13} weight="bold" />}>
          {effectPhrase(item)}
        </Chip>
        {item.status ? <Chip tone="outline">{(item.status.charAt(0).toUpperCase() + item.status.slice(1)).replace(/_/g, " ")}</Chip> : null}
        {item.due ? (
          <Chip tone="outline" icon={<CalendarBlank size={13} />}>
            Due {dayLabel(item.due)}
          </Chip>
        ) : null}
      </div>
      <H className={hideTitle ? "sr-only" : `mt-2.5 text-[17px] font-semibold leading-snug ${item.redacted ? "text-ink-2" : "text-ink"}`}>
        {item.redacted ? (
          <span className="inline-flex items-start gap-2">
            <EyeSlash size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            {itemLabel(item)}
          </span>
        ) : (
          itemLabel(item)
        )}
      </H>
      {item.why ? (
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-2">{item.why}</p>
      ) : item.redacted ? (
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-3">
          Its wording stays with the people who were there. Its owner can share it with you in a settle thread.
        </p>
      ) : null}
      {item.owner || item.team ? (
        <p className="mt-2 text-[14px] text-ink-3">
          {item.owner ? <>Owner: <span className="font-semibold text-ink-2">{item.owner.name}</span></> : null}
          {item.owner && item.team ? ", " : null}
          {item.team ? <>{item.owner ? "team" : "Team"} <span className="font-semibold text-ink-2">{item.team}</span></> : null}
        </p>
      ) : null}
      {item.settlement_id || item.href ? (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {item.effect === "contradicts" && item.settlement_id ? (
            <LinkButton href={`/work/settle/${item.settlement_id}`} size="sm">
              <Lightning size={15} weight="bold" aria-hidden />
              Settle it together
            </LinkButton>
          ) : null}
          {item.href ? (
            <LinkButton href={item.href} size="sm" variant="outline">
              {OPEN_LABEL[item.kind]}
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
