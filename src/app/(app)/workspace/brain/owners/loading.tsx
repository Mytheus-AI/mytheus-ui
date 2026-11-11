import { Bone, ButtonBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton, WellSkeleton } from "@/components/admin/AdminSkeletons";

/* Who owns what while it loads: the section's title and lead, then the owners card (the add row,
   one row per topic with its person, the count) beside the by-person well. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading who owns what">
      <BrainHeadSkeleton title="w-44" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <div aria-hidden className={cardClass({ flush: true })}>
          <div className="grid gap-3 border-b border-line px-4 py-4 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            {[0, 1].map((i) => (
              <div key={i} className="min-w-0">
                <TextBone className="mb-1 text-[12.5px] font-semibold" widths={["w-14"]} />
                <Bone className="h-11 w-full" />
              </div>
            ))}
            <ButtonBone label="Add owner" />
          </div>
          <div className="divide-y divide-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-[22px]">
                <TextBone className="min-w-0 flex-1 text-[15px] font-semibold" widths={["w-32"]} />
                <Bone className="h-10 w-full sm:w-[330px]" />
                <Bone className="h-9 w-9" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-line bg-surface-2 px-4 py-3 sm:px-[22px]">
            <TextBone className="text-[12.5px]" widths={["w-44"]} />
          </div>
        </div>
        <WellSkeleton title="w-24" lines={["w-48", "w-20", "w-44", "w-24", "w-40", "w-20", "w-44", "w-28"]} />
      </div>
    </SkeletonSection>
  );
}
