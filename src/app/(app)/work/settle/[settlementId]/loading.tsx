import { Bone, CardHeadSkeleton, ChipBone, ShapeBone, SkeletonSection, TextBone } from "@/components/ui/Page";

/* A thread to settle while it loads, inside the My work layout, from SettleThread's frame: the
   back link, the h2 row with its status chip and line, the card holding the two decisions side by
   side (from md), then the messages beside "Settle it" (360px from lg). */
function Side({ mine }: { mine: boolean }) {
  return (
    <div className={`min-w-0 rounded-card px-4 py-4 sm:px-5 ${mine ? "bg-surface-2" : "border border-line bg-surface"}`}>
      <TextBone className="text-[13px] font-semibold" widths={["w-28"]} />
      <TextBone className="mt-2 text-[17px] font-semibold leading-snug" widths={["w-[85%]"]} />
      <TextBone className="mt-3 text-[13px]" widths={["w-40"]} />
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading the thread">
      <ShapeBone className="mb-3 inline-flex min-h-[40px] items-center gap-1.5 px-1 text-[14px] font-semibold">
        <span className="inline-block h-3.5 w-3.5" />
        All decisions to settle
      </ShapeBone>
      <div aria-hidden className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0 flex-[1_1_320px]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <TextBone className="display text-[clamp(22px,2.4vw,26px)]" widths={["w-64"]} />
            <ChipBone label="To settle" />
          </div>
          <TextBone className="mt-1 max-w-[75ch] text-[15px]" widths={["w-[420px]"]} narrow={["w-[50%]"]} />
        </div>
      </div>
      <div aria-hidden className="rounded-card border border-line bg-surface px-4 py-[18px] shadow-warm-1 sm:px-[22px]">
        <div className="grid gap-3 md:grid-cols-2">
          <Side mine />
          <Side mine={false} />
        </div>
        <TextBone className="mt-4 max-w-[78ch] text-[15px] leading-relaxed" widths={["w-[70%]"]} />
      </div>
      <div aria-hidden className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <CardHeadSkeleton title="w-36" divided />
          <div className="space-y-4 px-4 py-5 sm:px-[22px]">
            <TextBone className="text-[15px] leading-relaxed" widths={["w-[70%]", "w-[45%]"]} />
          </div>
          <div className="border-t border-line px-4 py-4 sm:px-[22px]">
            <Bone className="h-11 w-full" />
          </div>
        </div>
        <div className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <CardHeadSkeleton title="w-24" description={["w-[85%]"]} divided />
          <div className="divide-y divide-line">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-4 sm:px-[22px]">
                <TextBone className="text-[15px] font-semibold" widths={["w-40"]} />
                <TextBone className="mt-1 text-[14px] leading-relaxed" widths={["w-[85%]"]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonSection>
  );
}
