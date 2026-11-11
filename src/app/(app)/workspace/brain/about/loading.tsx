import { Bone, ButtonBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { BrainHeadSkeleton } from "@/components/admin/AdminSkeletons";

/* About the company while it loads: the section's title and lead, then the profile form (what the
   company does, industry, products and customers, the save bar) beside what every agent reads. */
function Label({ w = "w-40" }: { w?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <TextBone className="text-[15px] font-semibold" widths={[w]} />
      <TextBone className="text-[12.5px]" widths={["w-16"]} />
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading about the company">
      <BrainHeadSkeleton title="w-52" />
      <div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div aria-hidden className={cardClass({ flush: true })}>
            <div className="grid gap-6 px-4 py-5 sm:px-[22px] sm:py-6">
              <div>
                <Label w="w-48" />
                <Bone className="mt-1.5 h-[185px] w-full" />
                <TextBone className="mt-1.5 text-[14px]" widths={["w-[70%]"]} />
              </div>
              <div>
                <Label w="w-28" />
                <Bone className="mt-1.5 h-11 w-full" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Label w="w-24" />
                    <Bone className="mt-1.5 h-[84px] w-full" />
                    <TextBone className="mt-1.5 text-[14px]" widths={["w-[60%]"]} />
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
              <ButtonBone label="Save company profile" />
            </div>
          </div>
          <div aria-hidden className={cardClass({ tone: "well" })}>
            <TextBone className="text-[12.5px] font-semibold" widths={["w-36"]} />
            <TextBone className="mt-3 text-[14px] leading-relaxed" widths={["w-full", "w-full", "w-[90%]", "w-[60%]"]} />
            <TextBone className="mt-3 text-[14px] leading-relaxed" widths={["w-40"]} />
            <TextBone className="mt-3 text-[14px] leading-relaxed" widths={["w-52"]} />
            <TextBone className="mt-3 text-[14px] leading-relaxed" widths={["w-48"]} />
          </div>
        </div>
      </div>
    </SkeletonSection>
  );
}
