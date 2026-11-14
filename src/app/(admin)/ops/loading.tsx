import { Bone, PageHeadSkeleton, SkeletonSection } from "@/components/ui/Page";
import { KpiStripSkeleton, SectionCardSkeleton } from "@/components/admin/AdminSkeletons";

/* The overview while it loads, inside the ops frame: the title row, the five figures, the trend
   beside the plan ring, the map, then the quota and activity cards, each at its loaded size. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading the overview">
      <PageHeadSkeleton title="w-36" context={["w-[620px]"]} narrow={["w-[60%]"]} />
      <div className="flex flex-col gap-5 xl:gap-6">
        <KpiStripSkeleton count={5} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:gap-6">
          <SectionCardSkeleton title="w-44" description={["w-[70%]"]}>
            <div className="px-4 py-[18px] sm:px-[22px]">
              <Bone className="h-[232px] w-full" />
            </div>
          </SectionCardSkeleton>
          <SectionCardSkeleton title="w-44" description={["w-[80%]"]}>
            <div className="flex items-center gap-6 px-4 py-[18px] sm:px-[22px]">
              <Bone className="h-[136px] w-[136px] shrink-0 !rounded-full" />
              <div className="flex flex-1 flex-col gap-3">
                <Bone className="h-5 w-full" />
                <Bone className="h-5 w-4/5" />
                <Bone className="h-5 w-3/5" />
              </div>
            </div>
          </SectionCardSkeleton>
        </div>
        <SectionCardSkeleton title="w-48" description={["w-[55%]"]}>
          <div className="px-4 py-[18px] sm:px-[22px]">
            <Bone className="aspect-[144/55] w-full lg:w-[63%]" />
          </div>
        </SectionCardSkeleton>
        <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
          {[0, 1].map((i) => (
            <SectionCardSkeleton key={i} title="w-48" description={["w-[75%]"]}>
              <div className="px-4 py-[18px] sm:px-[22px]">
                <Bone className="h-[220px] w-full" />
              </div>
            </SectionCardSkeleton>
          ))}
        </div>
      </div>
    </SkeletonSection>
  );
}
