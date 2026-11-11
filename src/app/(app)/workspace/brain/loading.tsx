import { Bone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";

/* The company brain's overview while it loads, inside the brain layout (its context line and
   section list stay put): the readiness card (score, bead line, the five checks), then the six
   section tiles, two across from md. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading the company brain" className="flex flex-col gap-6">
      <div aria-hidden className={cardClass({ flush: true })}>
        <div className="grid gap-x-10 gap-y-5 px-5 pb-6 pt-5 sm:px-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:items-end">
          <div className="min-w-0">
            <TextBone className="text-[15px] font-semibold" widths={["w-44"]} />
            <TextBone className="display mt-1 text-[56px] leading-none" widths={["w-32"]} />
          </div>
          <div className="min-w-0">
            <TextBone className="max-w-[56ch] text-[15px] leading-relaxed" widths={["w-80 max-w-full"]} narrow={["w-24"]} />
            <div className="relative mt-4 h-6">
              <Bone className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2" />
            </div>
          </div>
        </div>
        <div className="grid gap-px border-t border-line bg-line md:grid-cols-2 xl:grid-cols-3">
          {[false, false, false, true, true].map((open, i) => (
            <div key={i} className="flex min-w-0 items-start gap-3 bg-surface px-5 py-4 sm:px-6">
              <Bone className="mt-px h-[22px] w-[22px] shrink-0 !rounded-full" />
              <div className="min-w-0 flex-1">
                <TextBone className="text-[15px] font-semibold" widths={["w-36"]} />
                <TextBone className="mt-0.5 text-[14px] leading-snug" widths={["w-24"]} />
                {open ? <Bone className="mt-2 h-8 w-24" /> : null}
              </div>
            </div>
          ))}
          <div className="hidden bg-bg-2 xl:block" />
        </div>
      </div>
      <div>
        <div className="grid gap-4 md:grid-cols-2 min-[1700px]:grid-cols-3">
          {[3, 2, 4, 3, 3, 2].map((n, i) => (
            <div key={i} aria-hidden className={cardClass({ className: "flex min-h-[188px] flex-col" })}>
              <div className="flex items-baseline justify-between gap-3">
                <TextBone className="text-[17px] font-semibold" widths={["w-32"]} />
                <TextBone className="text-[12.5px] font-semibold" widths={["w-16"]} />
              </div>
              <div className="mt-3 flex-1">
                <TextBone className="text-[14px] leading-relaxed" widths={Array.from({ length: n }, (_, k) => (k === n - 1 ? "w-[45%]" : "w-[85%]"))} />
              </div>
              <TextBone className="mt-4 text-[14px] font-semibold" widths={["w-14"]} />
            </div>
          ))}
        </div>
      </div>
    </SkeletonSection>
  );
}
