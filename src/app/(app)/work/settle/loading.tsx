import { CardHeadSkeleton, ChipBone, SectionBarSkeleton, SkeletonSection, TextBone } from "@/components/ui/Page";

/* To settle while it loads, inside the My work layout, from SettleList's frame: the SectionBar's
   line, then the "To settle" card (head with its description and count, rows of your decision
   beside theirs) and the "Settled" card under it. */
function Row() {
  return (
    <div className="grid gap-x-5 gap-y-2 px-4 py-[18px] sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
      <span className="min-w-0">
        <TextBone className="text-[13px] font-semibold" widths={["w-24"]} />
        <TextBone className="mt-0.5 text-[15px] font-semibold leading-snug" widths={["w-[80%]"]} />
      </span>
      <span className="min-w-0">
        <TextBone className="text-[13px] font-semibold" widths={["w-32"]} />
        <TextBone className="mt-0.5 text-[15px] leading-snug" widths={["w-[70%]"]} />
      </span>
      <span className="flex items-center gap-3 md:flex-col md:items-end md:gap-1.5">
        <ChipBone label="To settle" />
        <TextBone className="text-[13px]" widths={["w-14"]} />
      </span>
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading the decisions to settle">
      <SectionBarSkeleton context={["w-[560px]", "w-[180px]"]} narrow={["w-[60%]"]} />
      <div className="space-y-5">
        <SettleCard title="w-24" description rows={2} />
        <SettleCard title="w-20" rows={1} />
      </div>
    </SkeletonSection>
  );
}

function SettleCard({ title, description = false, rows }: { title: string; description?: boolean; rows: number }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <CardHeadSkeleton title={title} description={description ? ["w-[60%]"] : undefined} right={<ChipBone label="2" />} divided />
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <Row key={i} />
        ))}
      </div>
    </div>
  );
}
