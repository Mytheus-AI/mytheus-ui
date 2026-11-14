import { ButtonBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { FieldRowSkeleton, SectionCardSkeleton, TableSkeleton, OpsHeadSkeleton } from "@/components/admin/AdminSkeletons";

/* Feature flags while they load, inside the ops layout: the flags table, then the new-flag form. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading feature flags" className="flex flex-col gap-5">
      <OpsHeadSkeleton title="w-36" context={["w-[620px]"]} narrow={["w-[70%]", "w-[40%]"]} />
      <SectionCardSkeleton title="w-16" description={["w-[50%]"]} right={<TextBone className="text-[14px]" widths={["w-20"]} />}>
        <TableSkeleton rows={4} cols={4} />
      </SectionCardSkeleton>
      <SectionCardSkeleton title="w-24" description={["w-[60%]"]}>
        <FieldRowSkeleton />
        <FieldRowSkeleton />
        <FieldRowSkeleton />
        <div className="px-4 py-3.5 sm:px-[22px]">
          <ButtonBone label="Create flag" />
        </div>
      </SectionCardSkeleton>
    </SkeletonSection>
  );
}
