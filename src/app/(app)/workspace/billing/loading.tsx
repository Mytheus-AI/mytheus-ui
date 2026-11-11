import { Bone, CardHeadSkeleton, ChipBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { EmptyStateSkeleton, SectionCardSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Usage and billing while it loads, inside the console layout: the plan card, the agent token
   budget with its big figure and meter, the two usage cards side by side from lg, and invoices. */
/** UsageMeter: the label row, the 12px meter with its scale, and the level line. */
function MeterRow() {
  return (
    <div className="px-4 py-[18px] sm:px-[22px]">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <TextBone className="text-[15px] font-semibold" widths={["w-32"]} />
        <TextBone className="text-[14px]" widths={["w-36"]} />
      </div>
      <Bone className="h-3 w-full !rounded-full" />
      <div className="mt-1.5 h-5" />
      <TextBone className="mt-1 text-[14px]" widths={["w-40"]} />
    </div>
  );
}

/** A model tier: the name and count, the 8px bar, and what the tier is for. */
function TierRow() {
  return (
    <div className="px-4 py-4 sm:px-[22px]">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
        <TextBone className="text-[14px]" widths={["w-20"]} />
      </div>
      <Bone className="h-2 w-full !rounded-full" />
      <TextBone className="mt-1.5 text-[14px]" widths={["w-48"]} />
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading usage and billing" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-44" context={["w-[620px]", "w-40"]} narrow={["w-[60%]"]} />
      <div aria-hidden className={cardClass()}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <ChipBone label="Current plan" />
            <TextBone className="display mt-3 text-[30px]" widths={["w-32"]} />
            <TextBone className="mt-1 text-[22px]" widths={["w-72 max-w-full"]} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 md:flex-col">
            {["w-48", "w-56", "w-60"].map((w) => (
              <TextBone key={w} className="text-[14px]" widths={[w]} />
            ))}
          </div>
        </div>
      </div>
      <div aria-hidden className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-44" description={["w-72 max-w-full"]} right={<ChipBone label="Within budget" />} />
        <div className="px-4 pb-5 pt-1 sm:px-[22px]">
          <TextBone className="display text-[44px] leading-none" widths={["w-60 max-w-full"]} />
          <Bone className="mt-4 h-3 w-full !rounded-full" />
          <div className="mt-1.5 h-5" />
          <TextBone className="mt-1 text-[14px]" widths={["w-52"]} />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCardSkeleton title="w-52" description={["w-[80%]"]}>
          <MeterRow />
          <MeterRow />
          <MeterRow />
        </SectionCardSkeleton>
        <SectionCardSkeleton title="w-44" description={["w-[80%]"]}>
          <TierRow />
          <TierRow />
          <TierRow />
        </SectionCardSkeleton>
      </div>
      <SectionCardSkeleton title="w-24" description={["w-[50%]"]}>
        <EmptyStateSkeleton />
        <div className="flex items-center gap-2 px-4 py-3.5 sm:px-[22px]">
          <TextBone className="text-[14px]" widths={["w-72 max-w-full"]} />
        </div>
      </SectionCardSkeleton>
    </SkeletonSection>
  );
}
