import { cardClass, cardPadX } from "@/components/ui/Card";
import { Bone, CardHeadSkeleton, CardSkeleton, ChipBone, Page, pageTitleClass, TextBone } from "@/components/ui/Page";

/* The agent page while it loads, in AgentWorkspace's own grid: the portrait on its stage (the
   148px face, "Your Myte", the name as the title, the note in its voice), then "Make it yours"
   and the form's two cards and footer; the side column (what it listens for, topics you watch,
   what it kept) sits beside it from xl and between the portrait and the form below xl, as the
   page puts it. */
function Aside() {
  return (
    <>
      <div className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-40" right={<TextBone className="text-[14px]" widths={["w-8"]} />} />
        <div className={`${cardPadX} space-y-5 pb-[18px]`}>
          <TextBone className="text-[17px] font-semibold" widths={["w-40"]} />
          {[0, 1].map((i) => (
            <div key={i}>
              <TextBone className="text-[12.5px] font-semibold" widths={["w-28"]} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ChipBone label="Pricing" />
                <ChipBone label="Launch plan" />
                <ChipBone label="Hiring" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-36" description={["w-[95%]", "w-[90%]", "w-[40%]"]} />
        <div className={`${cardPadX} pb-[18px]`}>
          <Bone className="h-11 w-full" />
        </div>
      </div>
      <CardSkeleton rows={3} />
    </>
  );
}

/** The settings form's FieldRow: the label and help on the left, the field on the right from md. */
function FieldRowSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`grid gap-2.5 py-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8 md:py-[18px] ${cardPadX}`}>
      <div>
        <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
        <TextBone className="mt-0.5 max-w-[56ch] text-[14px] leading-relaxed" widths={tall ? ["w-[85%]", "w-[30%]"] : ["w-[80%]"]} />
      </div>
      <div>
        <Bone className={`w-full ${tall ? "h-[115px]" : "h-11"}`} />
        {tall ? <TextBone className="mt-1 text-[12.5px]" widths={["ml-auto w-28"]} /> : null}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <Page className="pt-2" label="Loading your Myte">
      <div aria-hidden className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="rounded-hero bg-bg-2 px-5 py-6 sm:px-7 sm:py-7 [&_.mx-bone]:bg-bg-3">
            <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
              <Bone className="mx-auto h-[148px] w-[148px] !rounded-full bg-bg-3 md:mx-0" />
              <div className="min-w-0">
                <TextBone className="text-[12.5px] font-semibold" widths={["mx-auto w-20 md:mx-0"]} />
                <TextBone className={`${pageTitleClass} mt-1`} widths={["mx-auto w-56 md:mx-0"]} />
                <TextBone className="mt-2 text-[15px]" widths={["mx-auto w-[85%] md:mx-0"]} narrow={["mx-auto w-[60%]"]} />
                <div className="mt-4 rounded-card border border-line bg-surface px-4 py-3.5 shadow-warm-1 sm:px-[22px] [&_.mx-bone]:bg-bg-2">
                  <TextBone className="text-[12.5px] font-semibold" widths={["w-40"]} />
                  <TextBone className="mt-1.5 font-display text-[17px] italic leading-snug" widths={["w-[95%]", "w-[50%]"]} narrow={["w-[40%]"]} />
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-5 xl:hidden">
            <Aside />
          </div>
          <div>
            <TextBone className="display text-[22px]" widths={["w-40"]} />
            <TextBone className="mt-1 max-w-[68ch] text-[15px]" widths={["w-[95%]", "w-[35%]"]} narrow={["w-[70%]", "w-[40%]"]} />
            <div className="mt-4 grid items-start gap-5">
              <div className={cardClass({ flush: true })}>
                <CardHeadSkeleton title="w-24" description={["w-[85%]"]} className="!pb-4" />
                <div className="divide-y divide-line border-t border-line">
                  <FieldRowSkeleton />
                  <div className={`${cardPadX} py-4 md:py-[18px]`}>
                    <div className="flex flex-wrap items-center gap-4">
                      <Bone className="h-24 w-24 shrink-0 !rounded-full" />
                      <div className="min-w-0 flex-1">
                        <TextBone className="mb-2 text-[13px] font-semibold" widths={["w-16"]} />
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: 7 }, (_, i) => (
                            <Bone key={i} className="h-12 w-12 !rounded-full" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className={cardClass({ flush: true })}>
                <CardHeadSkeleton title="w-28" description={["w-[85%]"]} className="!pb-4" />
                <div className="divide-y divide-line border-t border-line">
                  <div className={`${cardPadX} py-4 md:py-[18px]`}>
                    <TextBone className="mb-3 text-[15px] font-semibold" widths={["w-24"]} />
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`flex h-full items-start gap-3 rounded-ctl border p-3.5 ${i === 5 ? "border-dashed border-line-2" : "border-line"}`}>
                          <Bone className="mt-0.5 h-5 w-5 shrink-0 !rounded-full" />
                          <div className="min-w-0 flex-1">
                            <TextBone className="text-[15px] font-semibold" widths={["w-[45%]"]} />
                            <TextBone className="mt-0.5 text-[14px]" widths={["w-[80%]"]} />
                            {i < 5 ? <TextBone className="mt-1.5 font-display text-[15px] italic leading-snug" widths={["w-[95%]", "w-[60%]"]} narrow={["w-[50%]"]} /> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <FieldRowSkeleton tall />
                </div>
              </div>
              <div className={cardClass({ flush: true })}>
                <div className={`flex items-center gap-x-4 bg-surface-2 py-3.5 ${cardPadX}`}>
                  <Bone className="h-11 w-[118px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hidden space-y-5 xl:sticky xl:top-2 xl:block">
          <Aside />
        </div>
      </div>
    </Page>
  );
}
