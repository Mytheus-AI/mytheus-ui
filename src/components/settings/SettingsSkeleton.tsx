import type { ReactNode } from "react";
import { cardClass, cardPadX } from "@/components/ui/Card";
import { textLinkClass } from "@/components/ui/TextLink";
import { Bone, ButtonBone, CardHeadSkeleton, ShapeBone, SectionBarSkeleton, SkeletonSection, TextBone } from "@/components/ui/Page";

/* The skeletons of the Settings panels, from the kit and the panels' own classes. The Settings
   layout keeps its title and section list on screen; each panel's loading.tsx draws the panel's
   SectionBar (its h2 and line of context) and its cards in order, with each card's head and rows
   in the shape of the form rows they stand for (`InlineRow`, `FieldRow`, `InfoRow` in ui/Form). */

/** SectionBar with a title, as every Settings panel opens. */
export function SettingsBarSkeleton({ title = "w-40", context = ["w-[520px]"], narrow = ["w-[70%]"], action }: { title?: string; context?: string[]; narrow?: string[]; action?: string }) {
  return (
    <SectionBarSkeleton
      title={title}
      context={context}
      narrow={narrow}
      actions={
        action ? (
          <ShapeBone className={textLinkClass}>
            {action}
            <span className="inline-block h-3 w-3" />
          </ShapeBone>
        ) : undefined
      }
    />
  );
}

export type RowShape = "inline" | "field" | "info" | "text" | "choices";

/** One form row's skeleton, in the row's own padding. */
export function FormRowSkeleton({ shape = "inline" }: { shape?: RowShape }) {
  if (shape === "info") {
    return (
      <div className={`flex items-start gap-3.5 py-4 md:py-[18px] ${cardPadX}`}>
        <Bone className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <TextBone className="text-[15px] font-semibold" widths={["w-40"]} />
          <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[90%]", "w-[60%]"]} />
        </div>
      </div>
    );
  }
  if (shape === "field") {
    return (
      <div className={`grid gap-2.5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8 md:py-[18px] ${cardPadX}`}>
        <div className="min-w-0">
          <TextBone className="text-[15px] font-semibold" widths={["w-32"]} />
          <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[80%]"]} />
        </div>
        <Bone className="h-11 w-full" />
      </div>
    );
  }
  if (shape === "text") {
    return (
      <div className={`py-4 ${cardPadX}`}>
        <TextBone className="text-[14px] leading-relaxed" widths={["w-[92%]", "w-[55%]"]} />
      </div>
    );
  }
  if (shape === "choices") {
    return (
      <div className={`py-4 md:py-[18px] ${cardPadX}`}>
        <TextBone className="text-[15px] font-semibold" widths={["w-40"]} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Bone className="h-[68px] w-full" />
          <Bone className="h-[68px] w-full" />
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4 md:py-[18px] ${cardPadX}`}>
      <div className="min-w-0 flex-[1_1_16rem]">
        <TextBone className="text-[15px] font-semibold" widths={["w-40"]} />
        <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[75%]"]} />
      </div>
      <Bone className="h-7 w-12 shrink-0 !rounded-full" />
    </div>
  );
}

export type CardSpec = {
  title?: string;
  /** description line widths under the title */
  description?: string[];
  rows: RowShape[];
  /** the card's own footer action (a Save button) */
  save?: string;
  right?: ReactNode;
};

/** A SectionCard's skeleton: CardHead (with `!pb-4`), a hairline, then the rows. */
export function SettingsCardSkeleton({ card }: { card: CardSpec }) {
  return (
    <div aria-hidden className={cardClass({ flush: true })}>
      <CardHeadSkeleton title={card.title ?? "w-40"} description={card.description ?? ["w-[70%]"]} right={card.right} className="!pb-4" />
      <div className="divide-y divide-line border-t border-line">
        {card.rows.map((r, i) => (
          <FormRowSkeleton key={i} shape={r} />
        ))}
        {card.save ? (
          <div className={`flex justify-end py-4 ${cardPadX}`}>
            <ButtonBone label={card.save} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** A whole Settings panel: the bar, then its cards in `wrapClass` (the panel's own stack). */
export function SettingsPanelSkeleton({
  label,
  bar,
  cards,
  wrapClass = "grid gap-5",
  children,
}: {
  label: string;
  bar: Parameters<typeof SettingsBarSkeleton>[0];
  cards?: CardSpec[];
  wrapClass?: string;
  children?: ReactNode;
}) {
  return (
    <SkeletonSection label={label}>
      <SettingsBarSkeleton {...bar} />
      {children ?? (
        <div className={wrapClass}>
          {(cards ?? []).map((c, i) => (
            <SettingsCardSkeleton key={i} card={c} />
          ))}
        </div>
      )}
    </SkeletonSection>
  );
}
