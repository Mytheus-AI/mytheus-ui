import { Bone, ButtonBone, CardHeadSkeleton, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton, WellSkeleton } from "@/components/admin/AdminSkeletons";

/* Goals while they load: the section's title and lead, then the active goals card (numbered goals
   with their period, owner and actions, and the add-a-goal form) beside the past goals well. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading goals">
      <BrainHeadSkeleton title="w-24" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,330px)]">
        <div aria-hidden className={cardClass({ flush: true })}>
          <CardHeadSkeleton title="w-28" right={<TextBone className="text-[12.5px]" widths={["w-12"]} />} />
          <div className="divide-y divide-line border-t border-line">
            {[1, 0, 0].map((desc, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-[22px]">
                <Bone className="h-[22px] w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-[60%]"]} />
                  {desc ? <TextBone className="mt-1 text-[14px]" widths={["w-[50%]"]} /> : null}
                  <div className="mt-2 flex items-center gap-3">
                    <Bone className="h-7 w-20 !rounded-full" />
                    <Bone className="h-7 w-7 !rounded-full" />
                    <TextBone className="text-[14px]" widths={["w-20"]} />
                  </div>
                  <div className="mt-2 flex gap-3">
                    <ButtonBone label="Mark achieved" size="sm" />
                  </div>
                </div>
                <Bone className="hidden h-9 w-36 sm:block" />
              </div>
            ))}
          </div>
          <div className="border-t border-line bg-surface-2 px-4 py-4 sm:px-[22px]">
            <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
            <TextBone className="mt-3 text-[12.5px] font-semibold" widths={["w-10"]} />
            <Bone className="mt-1 h-11 w-full" />
            <div className="mt-4 grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
              <Bone className="h-11 w-full" />
              <Bone className="h-11 w-full" />
            </div>
            <Bone className="mt-4 h-[68px] w-full" />
            <ButtonBone label="Add goal" size="sm" className="mt-4" />
          </div>
        </div>
        <WellSkeleton title="w-40" lines={["w-full", "w-[60%]"]} />
      </div>
    </SkeletonSection>
  );
}
