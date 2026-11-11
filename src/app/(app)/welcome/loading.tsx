import { cardClass, cardPadX } from "@/components/ui/Card";
import { Bone, CardHeadSkeleton, ChipBone, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* The welcome brief while it loads, in the page's own frame and rhythm (one `space-y-5` article):
   the title row, "What we do" beside its facts well, the three cards of what matters, who to ask
   and your team on the page's 12-column grid, the company's words, then what agents never note
   beside the next step. */
export default function Loading() {
  return (
    <Page label="Loading your welcome brief">
      <div aria-hidden className="space-y-5">
        <PageHeadSkeleton title="w-[min(360px,80%)]" context={["w-72"]} />

        <div className={cardClass({ className: "grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]" })}>
          <div className="min-w-0">
            <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-28"]} />
            <TextBone className="mt-2 max-w-[68ch] text-[17px] leading-relaxed" widths={["w-[96%]", "w-[92%]", "w-[60%]"]} narrow={["w-[80%]", "w-[50%]"]} />
          </div>
          <div className="grid content-start gap-5 rounded-ctl bg-bg-2 p-5 lg:self-start">
            <div>
              <TextBone className="text-[12.5px] font-semibold" widths={["w-16"]} />
              <TextBone className="mt-1 text-[15px] font-medium" widths={["w-40"]} />
            </div>
            <div>
              <TextBone className="text-[12.5px] font-semibold" widths={["w-24"]} />
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <ChipBone label="Meeting agents" className="!bg-bg-3" />
                <ChipBone label="Minutes" className="!bg-bg-3" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-12">
          <div className={cardClass({ flush: true, className: "xl:col-span-5" })}>
            <CardHeadSkeleton title="w-36" right={<ChipBone label="3 active" />} />
            <div className={`${cardPadX} space-y-4 pb-[18px]`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3.5">
                  <Bone className="h-[22px] w-6 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold leading-snug" widths={["w-[70%]"]} />
                    <TextBone className="mt-1 text-[14px] leading-relaxed" widths={["w-[90%]"]} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={cardClass({ flush: true, className: "xl:col-span-4" })}>
            <CardHeadSkeleton title="w-24" />
            <div className={`${cardPadX} divide-y divide-line pb-[18px]`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2.5">
                    <Bone className="h-8 w-8 !rounded-full" />
                    <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
                  </span>
                  <TextBone className="text-[14px] leading-snug" widths={["w-20"]} />
                </div>
              ))}
            </div>
          </div>
          <div className={cardClass({ flush: true, tone: "well", className: "lg:col-span-2 xl:col-span-3" })}>
            <CardHeadSkeleton title="w-24" />
            <div className={`${cardPadX} grid gap-3 pb-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1`}>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-w-0 items-center gap-3">
                  <Bone className="h-10 w-10 shrink-0 !rounded-full bg-bg-3" />
                  <span className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold" widths={["w-[70%]"]} />
                    <TextBone className="text-[12.5px]" widths={["w-[85%]"]} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cardClass({ flush: true })}>
          <CardHeadSkeleton title="w-44" right={<ChipBone label="6 words" />} />
          <div className={`${cardPadX} pb-[18px]`}>
            <Bone className="mb-4 h-11 w-full max-w-[360px]" />
            <div className="gap-x-10 md:columns-2 xl:columns-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="mb-4 break-inside-avoid">
                  <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
                  <TextBone className="text-[14px] leading-relaxed" widths={["w-[85%]"]} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-48" />
            <div className={`${cardPadX} pb-[18px]`}>
              <div className="flex flex-wrap gap-2">
                <ChipBone label="Salaries" />
                <ChipBone label="Health" />
                <ChipBone label="Hiring decisions" />
              </div>
              <TextBone className="mt-3 max-w-[68ch] text-[14px] leading-relaxed" widths={["w-[95%]", "w-[60%]"]} />
            </div>
          </div>
          <div className={cardClass({ tone: "well" })}>
            <TextBone className="display text-[22px]" widths={["w-48"]} />
            <TextBone className="mt-2 text-[15px] leading-relaxed" widths={["w-[95%]", "w-[55%]"]} />
            <div className="mt-4">
              <Bone className="h-11 w-40 bg-bg-3" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
