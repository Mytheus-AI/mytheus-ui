import { Bone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { EmptyStateSkeleton, OpsHeadSkeleton } from "@/components/admin/AdminSkeletons";

/* The audit log while the tenant list loads, inside the ops layout: the tab's title row, the
   tenant picker row, and the log card waiting for a tenant. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading the audit log" className="flex flex-col gap-5">
      <OpsHeadSkeleton title="w-28" context={["w-[600px]"]} narrow={["w-[60%]"]} />
      <div className="flex flex-col gap-4">
        <div aria-hidden className="flex flex-wrap items-center gap-3">
          <TextBone className="text-[14px] font-semibold" widths={["w-14"]} />
          <Bone className="h-9 w-full max-w-[300px] sm:w-[280px]" />
          <TextBone className="text-[14px]" widths={["w-40"]} />
        </div>
        <div aria-hidden className={cardClass({ flush: true })}>
          <EmptyStateSkeleton />
        </div>
      </div>
    </SkeletonSection>
  );
}
