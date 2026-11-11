import { Bone, ButtonBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton, WellSkeleton } from "@/components/admin/AdminSkeletons";

/* Ground rules while they load: the section's title and lead, then the topics form (the chip
   input, its hint, the common choices, the save bar) beside the two explainers. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading ground rules">
      <BrainHeadSkeleton title="w-36" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div aria-hidden className={cardClass({ flush: true })}>
          <div className="px-4 py-5 sm:px-[22px]">
            <div className="flex items-baseline justify-between gap-3">
              <TextBone className="text-[15px] font-semibold" widths={["w-48"]} />
              <TextBone className="text-[12.5px]" widths={["w-12"]} />
            </div>
            <Bone className="mt-1.5 h-[46px] w-full" />
            <TextBone className="mt-1.5 text-[14px]" widths={["w-[65%]"]} />
            <div className="mt-5">
              <TextBone className="text-[12.5px] font-semibold" widths={["w-28"]} />
              <div className="mt-2 flex flex-wrap gap-2">
                {["w-36", "w-40", "w-44", "w-36", "w-40"].map((w, i) => (
                  <Bone key={i} className={`h-9 ${w} !rounded-full`} />
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
            <ButtonBone label="Save ground rules" />
          </div>
        </div>
        <div className="grid gap-4">
          <WellSkeleton title="w-56" lines={["w-full", "w-full", "w-full", "w-full", "w-full", "w-full", "w-[50%]"]} />
          <WellSkeleton title="w-44" lines={["w-full", "w-[60%]", "w-full", "w-[40%]", "w-[90%]"]} />
        </div>
      </div>
    </SkeletonSection>
  );
}
