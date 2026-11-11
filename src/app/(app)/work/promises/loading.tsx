import { Bone, PageColumns, SectionBarSkeleton, ShapeBone, SkeletonSection, TextBone } from "@/components/ui/Page";

/* The promise ledger while it loads, inside the My work layout, from PromiseLedger's frame: the
   SectionBar with Add a promise, then in one stack the week card (CapacityWeek, five day bars)
   and PageColumns: the channel filters and the due-date groups, beside the tally and "Where your
   agent looks". */
function Group({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-surface-2 px-4 py-3 sm:px-5">
        <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
        <TextBone className="min-w-0 flex-1 text-[13px]" widths={["w-32"]} />
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="px-4 py-4 sm:px-5">
            <TextBone className="text-[15px] font-medium leading-snug" widths={[i % 2 ? "w-[50%]" : "w-[66%]"]} />
            <TextBone className="mt-1 text-[14px]" widths={["w-40"]} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading your promise ledger">
      <SectionBarSkeleton context={["w-[360px]"]} narrow={["w-[50%]"]} action={["Add a promise"]} />
      <div className="space-y-5">
        <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface px-4 !py-5 shadow-warm-1 sm:px-[22px]">
          <TextBone className="display text-[20px]" widths={["w-28"]} />
          <TextBone className="mt-1 text-[14.5px]" widths={["w-72"]} />
          <div className="mt-4 grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Bone key={i} className="h-[74px]" />
            ))}
          </div>
        </div>
        <PageColumns
          sticky={false}
          aside={
            <>
              <div aria-hidden className="relative grid grid-cols-2 divide-x divide-line overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
                {[0, 1].map((i) => (
                  <div key={i} className="px-5 py-4">
                    <TextBone className="display text-[30px] leading-none" widths={["w-8"]} />
                    <TextBone className="mt-1.5 text-[14px]" widths={[i ? "w-36" : "w-12"]} />
                  </div>
                ))}
              </div>
              <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
                <div className="px-4 pb-3 pt-[18px] sm:px-[22px]">
                  <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-44"]} />
                </div>
                <div className="divide-y divide-line border-t border-line text-[14px]">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-[22px]">
                      <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <TextBone widths={["w-20"]} />
                        <TextBone widths={["w-[85%]"]} />
                      </div>
                      <Bone className="h-[23px] w-9 !rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          }
        >
          <div className="min-w-0 space-y-4">
            <div aria-hidden className="flex flex-wrap items-center gap-2">
              <span className="inline-block h-4 w-4" />
              {["Meetings 3", "Slack 1"].map((c) => (
                <ShapeBone key={c} round className="inline-flex h-9 items-center gap-1.5 rounded-full border border-transparent px-3.5 text-[14px] font-semibold">
                  {c}
                </ShapeBone>
              ))}
            </div>
            <Group rows={2} />
            <Group rows={2} />
          </div>
        </PageColumns>
      </div>
    </SkeletonSection>
  );
}
