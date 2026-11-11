import { ButtonBone, SkeletonSection } from "@/components/ui/Page";
import { FieldRowSkeleton, SectionCardSkeleton, TableSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Support access while it loads, inside the console layout: the grant form (three rows and its
   button), then the grants table. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading support access" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-40" context={["w-[600px]", "w-32"]} narrow={["w-[70%]"]} />
      <SectionCardSkeleton title="w-32" description={["w-[70%]"]}>
        <FieldRowSkeleton />
        <FieldRowSkeleton />
        <FieldRowSkeleton />
        <div className="px-4 py-3.5 sm:px-[22px]">
          <ButtonBone label="Grant access" />
        </div>
      </SectionCardSkeleton>
      <SectionCardSkeleton title="w-24" description={["w-[50%]"]}>
        <TableSkeleton rows={3} cols={5} />
      </SectionCardSkeleton>
    </SkeletonSection>
  );
}
