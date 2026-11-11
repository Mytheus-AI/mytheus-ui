import { ButtonBone, Bone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { EmptyStateSkeleton, FieldRowSkeleton, SectionCardSkeleton, TableSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Data and privacy while it loads, inside the console layout: the workspace settings form
   (retention, privacy, agent confidence and its save bar), the export request and its list, then
   erasure. */
function InlineRowSkeleton({ control }: { control: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-[22px] md:py-[18px]">
      <div className="min-w-0 flex-[1_1_16rem]">
        <TextBone className="text-[15px] font-semibold" widths={["w-48"]} />
        <TextBone className="mt-0.5 max-w-[56ch] text-[14px] leading-relaxed" widths={["w-full", "w-[60%]"]} />
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading data and privacy" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-40" context={["w-[620px]", "w-72"]} narrow={["w-[70%]", "w-[50%]"]} />
      <div className="flex flex-col gap-6">
        <SectionCardSkeleton title="w-28" description={["w-[85%]"]}>
          <FieldRowSkeleton />
          <FieldRowSkeleton />
        </SectionCardSkeleton>
        <SectionCardSkeleton title="w-20" description={[]}>
          <InlineRowSkeleton control={<Bone className="h-7 w-12 !rounded-full" />} />
        </SectionCardSkeleton>
        <SectionCardSkeleton title="w-40" description={["w-[90%]", "w-[50%]"]}>
          <TableSkeleton rows={4} cols={3} fields={2} />
        </SectionCardSkeleton>
        <div aria-hidden className={cardClass({ className: "!py-3.5" })}>
          <ButtonBone label="Save settings" />
        </div>
      </div>
      <SectionCardSkeleton title="w-48" description={["w-[75%]"]}>
        <InlineRowSkeleton control={<ButtonBone label="Request export" icon />} />
      </SectionCardSkeleton>
      <SectionCardSkeleton title="w-36" description={["w-[70%]"]}>
        <TableSkeleton rows={2} cols={2} />
      </SectionCardSkeleton>
      <SectionCardSkeleton title="w-24" description={["w-[80%]"]}>
        <InlineRowSkeleton control={<ButtonBone label="Erase data" icon />} />
        <EmptyStateSkeleton compact />
      </SectionCardSkeleton>
    </SkeletonSection>
  );
}
