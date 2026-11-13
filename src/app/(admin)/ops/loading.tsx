import { Bone, SkeletonSection } from "@/components/ui/Page";
import { SectionCardSkeleton, StatCardSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* The overview while it loads, inside the ops layout: six figures, then the chart cards. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading the overview" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-28" context={["w-[520px]"]} narrow={["w-[60%]"]} />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      {[0, 1].map((row) => (
        <div key={row} className="grid gap-5 lg:grid-cols-2">
          {[0, 1].map((i) => (
            <SectionCardSkeleton key={i} title="w-40" description={["w-[70%]"]}>
              <div className="px-4 py-[18px] sm:px-[22px]">
                <Bone className="h-[152px] w-full" />
              </div>
            </SectionCardSkeleton>
          ))}
        </div>
      ))}
    </SkeletonSection>
  );
}
