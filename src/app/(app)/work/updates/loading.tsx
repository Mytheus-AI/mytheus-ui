import { Bone, CardHeadSkeleton, PageColumns, SectionBarSkeleton, SkeletonSection, TextBone } from "@/components/ui/Page";

/* Updates I owe while it loads, inside the My work layout, from StatusRequestsView's frame: the
   SectionBar's line, then PageColumns with "Waiting on you" (rows of an action and its three
   answers) and "Answered" in the main column, and the "How this works" well beside them. */
function AnswerRow() {
  return (
    <div className="px-4 py-4 sm:px-[22px]">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center xl:gap-6">
        <div className="min-w-0">
          <TextBone className="text-[15px] font-semibold leading-snug" widths={["w-[60%]"]} />
          <TextBone className="mt-1 text-[12.5px]" widths={["w-40"]} />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Bone className="h-10 w-24" />
          <Bone className="h-10 w-24" />
          <Bone className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading the updates you owe">
      <SectionBarSkeleton context={["w-64"]} />
      <PageColumns
        sticky={false}
        aside={
          <div aria-hidden className="relative overflow-hidden rounded-card bg-bg-2 px-4 py-[18px] sm:!p-6 sm:px-[22px]">
            <TextBone className="display text-[22px]" widths={["w-40"]} />
            <div className="mt-2 space-y-3">
              {[0, 1, 2].map((i) => (
                <TextBone key={i} className="text-[15px] leading-relaxed" widths={["w-[92%]", "w-[70%]"]} />
              ))}
              <TextBone className="pt-1 text-[15px] leading-relaxed" widths={["w-[88%]", "w-[40%]"]} />
            </div>
          </div>
        }
      >
        <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <CardHeadSkeleton title="w-36" />
          <div className="divide-y divide-line border-t border-line">
            <AnswerRow />
            <AnswerRow />
          </div>
        </div>
        <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <CardHeadSkeleton title="w-24" />
          <div className="px-4 pb-5 sm:px-[22px]">
            <TextBone className="text-[14px]" widths={["w-56"]} />
          </div>
        </div>
      </PageColumns>
    </SkeletonSection>
  );
}
