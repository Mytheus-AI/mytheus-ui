import { Bone, ButtonBone, SkeletonSection, TextBone, ShapeBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton } from "@/components/admin/AdminSkeletons";

/* Vocabulary while it loads: the section's title and lead, the count with Paste a list and Add
   term, then the terms card (search, the kind filters, the table head and the rows). */
const KINDS = ["All 5", "Product 1", "Codename 1", "Acronym 2", "Customer 1"];

export default function Loading() {
  return (
    <SkeletonSection label="Loading the vocabulary">
      <BrainHeadSkeleton title="w-36" narrow={["w-[70%]", "w-[40%]"]} />
      <div className="flex flex-col gap-4">
        <div aria-hidden className="flex flex-wrap items-center justify-between gap-3">
          <TextBone className="text-[14px]" widths={["w-[420px] max-w-full"]} />
          <div className="flex flex-wrap gap-2">
            <ButtonBone label="Paste a list" icon />
            <ButtonBone label="Add term" icon />
          </div>
        </div>
        <div aria-hidden className={cardClass({ flush: true })}>
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-[22px] lg:flex-row lg:items-center">
            <Bone className="h-10 lg:w-[300px] lg:shrink-0" />
            <div className="-mx-4 flex gap-1.5 overflow-hidden px-4 sm:mx-0 sm:flex-wrap sm:px-0">
              {KINDS.map((k) => (
                <ShapeBone key={k} round className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3.5 text-[14px] font-semibold">
                  {k}
                </ShapeBone>
              ))}
            </div>
          </div>
          <div className="hidden border-b border-line bg-surface-2 px-[22px] py-2.5 md:block">
            <TextBone className="text-[12.5px] font-semibold" widths={["w-[40%]"]} />
          </div>
          <div className="divide-y divide-line">
            {[1, 0, 0, 1, 0].map((alias, i) => (
              <div key={i} className="flex gap-4 px-4 py-3.5 sm:px-[22px]">
                <div className="min-w-0 flex-1">
                  <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
                  {alias ? <TextBone className="mt-0.5 text-[14px]" widths={["w-24"]} /> : null}
                </div>
                <Bone className="hidden h-[23px] w-20 !rounded-full md:block" />
                <TextBone className="hidden flex-[2] text-[14px] md:block" widths={["w-[70%]"]} />
                <Bone className="h-9 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </SkeletonSection>
  );
}
