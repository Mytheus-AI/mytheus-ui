import { Bone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { SectionCardSkeleton, StatCardSkeleton, TableSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Staff while it loads, inside the ops layout: the three figures, the staff table, then the
   activity chart beside the how-to. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading staff" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-32" context={["w-[540px]"]} narrow={["w-[60%]"]} />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <SectionCardSkeleton title="w-48" description={["w-[60%]"]}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-4 sm:px-[22px]">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <TextBone className="text-[15px] font-semibold" widths={["w-32"]} />
              <TextBone className="text-[14px]" widths={["w-28"]} />
            </div>
            <Bone className="h-2.5 w-full !rounded-full" />
          </div>
        ))}
      </SectionCardSkeleton>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCardSkeleton title="w-40" description={["w-[70%]"]}>
          <TableSkeleton rows={3} cols={2} />
        </SectionCardSkeleton>
        <SectionCardSkeleton title="w-36" description={["w-[70%]"]}>
          <TableSkeleton rows={3} cols={3} />
        </SectionCardSkeleton>
      </div>
    </SkeletonSection>
  );
}
