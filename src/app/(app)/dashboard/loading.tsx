import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, CardSkeleton, ChipBone, ListCardSkeleton, Page, TextBone } from "@/components/ui/Page";

/* Home while it loads, from the page's own frame and classes: DashboardHeader's row (the serif
   greeting, the lede, three figures that sit beside it from 721px and under it below), then the
   page's grid (one column, the 300 to 360px rail from 1101px; the rail is two columns between 721
   and 1100px). The main column holds the hero, the briefing (the same CardSkeleton the page streams
   it in with), Needs you, Catch up and the meeting brief's slot; the rail Today, Your tasks, Your
   and notes (decisions live on their own page). The first-run checklist is not drawn: most people have finished it. */

/* DashboardHeader's Figure, with its own classes around invisible copies of the real labels, so
   each figure takes the label's real width and wrap. */
function Figure({ label }: { label: string }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0 min-[721px]:px-[30px]">
      <span className="display relative block text-[34px] leading-none min-[721px]:text-[40px]">
        <span className="invisible">3</span>
        <Bone className="absolute inset-y-[12%] left-0 w-[1.1em]" />
      </span>
      <span className="relative mt-1.5 block max-w-none text-[12.5px] font-semibold leading-snug min-[721px]:max-w-[13ch]">
        <span className="invisible">{label}</span>
        <Bone className="absolute inset-y-[15%] left-0 w-full" />
      </span>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <Page label="Loading your dashboard">
      <div aria-hidden className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5 pb-6 pt-2 min-[721px]:pb-7">
        <div className="min-w-0 flex-[1_1_380px]">
          <TextBone className="display text-[clamp(28px,3vw,34px)]" widths={["w-[min(300px,80%)]"]} />
          <TextBone className="mt-2 max-w-[56ch] text-[15px] leading-normal" widths={["w-[95%]", "w-[60%]"]} />
        </div>
        <div className="grid flex-[1_1_100%] grid-cols-3 divide-x divide-line min-[721px]:flex min-[721px]:flex-[0_0_auto]">
          <Figure label="Meetings today" />
          <Figure label="Open tasks" />
          <Figure label="Items need you" />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div aria-hidden className="flex min-w-0 flex-col gap-7">
          <div className="overflow-hidden rounded-hero border border-line bg-bg-2 px-[18px] [&_.mx-bone]:bg-bg-3 pb-[22px] pt-5 shadow-warm-2 sm:px-7 sm:pb-7 sm:pt-[26px]">
            <div className="grid grid-cols-1 sm:min-h-[172px] sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
              <div className="flex min-w-0 flex-col sm:grid sm:grid-rows-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="flex flex-wrap items-center gap-2 sm:self-start">
                  <ChipBone label="Up next in 2 hours" className="!bg-bg-3" />
                  <ChipBone label="11:00 to 11:45" className="!bg-bg-3" />
                </div>
                <TextBone className="display my-4 max-w-[22ch] text-[clamp(32px,4.2vw,44px)] sm:my-3 sm:self-center" widths={["w-[90%]"]} />
                <div className="sm:self-end">
                  <div className="mb-1 flex items-center gap-3">
                    <span className="flex -space-x-2">
                      {[0, 1, 2, 3].map((i) => (
                        <Bone key={i} className="h-8 w-8 !rounded-full bg-bg-3 ring-2 ring-surface" />
                      ))}
                    </span>
                    <TextBone className="text-[14px] font-medium" widths={["w-40"]} />
                  </div>
                  <TextBone className="text-[14px] font-medium" widths={["w-56"]} />
                </div>
              </div>
              <div className="mt-[22px] flex flex-col gap-3 sm:mt-0 sm:items-end">
                <div className="hidden shrink-0 sm:block">
                  <TextBone className="display text-[36px] leading-none sm:text-[44px]" widths={["w-24"]} />
                  <TextBone className="mt-1 text-[12.5px] font-semibold" widths={["ml-auto w-16"]} />
                </div>
                <ButtonBone label="Open meeting" size="lg" className="max-[420px]:w-full" />
              </div>
            </div>
          </div>
          <CardSkeleton rows={2} />
          <div>
            <div className="mb-3 flex items-center justify-between gap-x-4">
              <TextBone className="display text-[22px]" widths={["w-32"]} />
              <TextBone className="text-[15px]" widths={["w-28"]} />
            </div>
            <TextBone className="-mt-2 mb-3 text-[14px]" widths={["w-[min(440px,90%)]"]} />
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div key={i} className={cardClass()}>
                  <div className="flex items-center gap-x-3">
                    <ChipBone label="Proposed decision" />
                    <TextBone className="text-[14px]" widths={["w-24"]} />
                  </div>
                  <TextBone className="mb-1 mt-2.5 text-[17px] font-semibold leading-snug" widths={[i ? "w-[55%]" : "w-[75%]"]} />
                  <div className="mt-3.5 flex gap-2">
                    <ButtonBone label="Confirm decision" size="sm" icon />
                    <ButtonBone label="Dismiss" size="sm" icon />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ListCardSkeleton head="w-24" headRight={<TextBone className="text-[15px]" widths={["w-24"]} />} rows={3} row={{ lead: "avatar-sm", chip: "2 decisions" }} />
          <CardSkeleton rows={2} />
        </div>

        <div aria-hidden className="grid min-w-0 grid-cols-1 items-start gap-5 min-[721px]:grid-cols-2 min-[1101px]:flex min-[1101px]:flex-col min-[1101px]:items-stretch">
          <div className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-16" right={<TextBone className="text-[12.5px] font-semibold" widths={["w-20"]} />} />
            <div className="px-[18px] pb-[18px] pt-1 sm:px-[22px]">
              {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-[62px_18px_minmax(0,1fr)] items-start gap-x-3 py-[9px]">
                  <TextBone className="text-[13px] font-semibold" widths={["w-12"]} />
                  <Bone className="mt-1 h-3 w-3 !rounded-full" />
                  <div>
                    <TextBone className="text-[15px] font-semibold leading-snug" widths={["w-[80%]"]} />
                    <TextBone className="text-[12.5px]" widths={["w-[45%]"]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ListCardSkeleton head="w-24" rows={4} row={{ meta: "w-[30%]", className: "py-3" }} />
          <ListCardSkeleton head="w-24" rows={3} row={{ meta: "w-[40%]", className: "py-3" }} />
        </div>
      </div>
    </Page>
  );
}
