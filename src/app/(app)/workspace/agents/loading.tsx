import { RowSkeleton, SkeletonSection } from "@/components/ui/Page";
import { SectionCardSkeleton, TableSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Agent collaboration while it loads, inside the console layout: the level setting and the grants
   table, each in its own section card. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading Myte collaboration" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-52" context={["w-[620px]", "w-80"]} narrow={["w-[70%]", "w-[50%]"]} />
      <SectionCardSkeleton title="w-44" description={["w-[60%]"]}>
        {[0, 1, 2, 3].map((i) => (
          <RowSkeleton key={i} lead="avatar-sm" title="w-48" meta="w-[55%]" />
        ))}
      </SectionCardSkeleton>
      <SectionCardSkeleton title="w-36" description={["w-[75%]"]}>
        <TableSkeleton rows={4} cols={5} />
      </SectionCardSkeleton>
    </SkeletonSection>
  );
}
