import { ButtonBone, ChipBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton } from "@/components/admin/AdminSkeletons";

/* Meeting types while they load: the section's title and lead, the count with New meeting type,
   the type cards (one column, two from sm, one again beside the editor from lg), and the editor
   panel's empty frame. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading meeting types">
      <BrainHeadSkeleton title="w-40" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div aria-hidden className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
            <ButtonBone label="New meeting type" size="sm" icon />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cardClass()}>
                <div className="flex items-start justify-between gap-3">
                  <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-36"]} />
                  {i === 0 ? <ChipBone label="Confidential" /> : null}
                </div>
                <TextBone className="mt-1 text-[14px] leading-snug" widths={["w-52"]} />
                <TextBone className="mt-3 text-[14px]" widths={["w-40"]} />
                <div className="mt-3 border-t border-line pt-3">
                  <TextBone className="text-[14px]" widths={["w-32"]} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div aria-hidden className="min-w-0">
          <div className="hidden flex-col items-center rounded-card border border-dashed border-line-2 bg-surface-2 px-6 py-10 lg:flex">
            <TextBone className="display text-[22px]" widths={["w-72 max-w-full"]} />
            <TextBone className="mt-1 flex w-full flex-col items-center text-[14px] leading-relaxed" widths={["w-80 max-w-full", "w-64 max-w-full"]} />
          </div>
        </div>
      </div>
    </SkeletonSection>
  );
}
