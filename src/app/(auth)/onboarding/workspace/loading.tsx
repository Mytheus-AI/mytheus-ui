import { Bone, ButtonBone, LoadingLabel, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";

/* The company brain setup while its data loads, on SetupFlow's own frame: the header row, the
   "Setting up" line, then the step rail (a progress line below lg), the step card with the About
   step's fields and its buttons, and what the agents know (from xl). The wordmark and the header
   aside are bones, since a skeleton holds nothing to focus. Keep it in step with
   components/org-brain/SetupFlow.tsx. */
export default function Loading() {
  return (
    <div aria-busy className="min-h-[100dvh] bg-bg font-sans">
      <LoadingLabel label="Loading the setup" />
      <div aria-hidden className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Bone className="h-[30px] w-[147px]" />
        <Bone className="h-[22px] w-14 sm:w-[200px]" />
      </div>
      <div aria-hidden className="mx-auto w-full max-w-[1320px] px-4 pb-16 sm:px-8">
        <TextBone className="mb-5 text-[14px] lg:mb-8" widths={["w-[460px] max-w-full"]} narrow={["w-40"]} />
        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[250px_minmax(0,1fr)_320px]">
          <div>
            <div className="hidden lg:block">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-3.5 py-3 pr-2">
                  <Bone className="mt-0.5 h-6 w-6 shrink-0 !rounded-full" />
                  <div className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
                    <TextBone className="text-[12.5px]" widths={["w-36"]} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 lg:hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <Bone key={i} className="h-[3px] flex-1 !rounded-full" />
              ))}
            </div>
          </div>
          <div className="min-w-0 rounded-hero border border-line bg-surface px-5 py-7 shadow-warm-1 sm:px-8 sm:py-9 lg:px-10">
            <TextBone className="text-[14px] font-semibold" widths={["w-24"]} />
            <TextBone className="display mt-1.5 text-[clamp(28px,3vw,34px)]" widths={["w-80 max-w-full"]} />
            <TextBone className="mt-2 max-w-[60ch] text-[15px] leading-relaxed" widths={["w-full", "w-[55%]"]} narrow={["w-[40%]"]} />
            <div className="mt-6 grid gap-5">
              <div>
                <TextBone className="text-[15px] font-semibold" widths={["w-48"]} />
                <Bone className="mt-1.5 h-[185px] w-full" />
                <TextBone className="mt-1.5 text-[14px]" widths={["w-[60%]"]} />
              </div>
              <div>
                <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
                <Bone className="mt-1.5 h-11 w-full" />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i} className="min-w-0">
                    <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
                    <Bone className="mt-1.5 h-[84px] w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5">
              <ButtonBone label="Save and continue" size="lg" />
              <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
            </div>
          </div>
          <div className="hidden xl:block">
            <div className={cardClass()}>
              <TextBone className="text-[14px] font-semibold" widths={["w-40"]} />
              <TextBone className="mt-3 text-[14px] leading-relaxed" widths={["w-full", "w-full", "w-[85%]", "w-[60%]"]} />
              <TextBone className="mt-4 text-[12.5px] font-semibold" widths={["w-20"]} />
              <TextBone className="mt-1 text-[14px] leading-relaxed" widths={["w-full", "w-[50%]"]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
