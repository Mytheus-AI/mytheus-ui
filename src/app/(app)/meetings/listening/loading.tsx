import { MEETINGS_TABS } from "@/components/app/nav";
import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ListCardSkeleton, Page, PageHeadSkeleton, TabsSkeleton, TextBone } from "@/components/ui/Page";

/* Listening while it loads, from the page's own frame: the title row with Interruptions and lines,
   the All meetings / Listening tabs, the week card (its head, the four totals, the seven days from
   xl and the day list below), then the evening digest and what your agent raised beside your rules
   and the privacy well. */

export default function Loading() {
  return (
    <Page label="Loading what your agent listens to">
      <PageHeadSkeleton title="w-36" context={["w-[560px]", "w-[300px]"]} narrow={["w-[40%]"]} action={["Interruptions and lines"]} />
      <TabsSkeleton labels={MEETINGS_TABS.map((t) => t.label)} className="mb-5" />

      <div aria-hidden className={cardClass({ flush: true })}>
        <CardHeadSkeleton
          title="w-24"
          description={["w-[300px]"]}
          divided
          right={
            <div className="flex items-center gap-1">
              <Bone className="h-9 w-9" />
              <Bone className="h-9 w-9" />
            </div>
          }
        />
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {["Attend", "Agent listens", "Skip", "Time back"].map((c) => (
            <div key={c} className="bg-surface px-4 py-3 sm:px-[22px]">
              <TextBone className="text-[13px] font-semibold" widths={["w-20"]} />
              <TextBone className="display mt-0.5 text-[26px]" widths={["w-10"]} />
            </div>
          ))}
        </div>
        <div className="hidden grid-cols-7 divide-x divide-line border-t border-line xl:grid">
          {Array.from({ length: 7 }, (_, d) => (
            <div key={d} className="min-w-0">
              <TextBone className="px-2.5 pb-2 pt-3 text-[13px] font-semibold" widths={["w-12"]} />
              <div className="space-y-2 px-2 pb-3">
                {Array.from({ length: d < 5 ? (d % 2) + 1 : 0 }, (_, i) => (
                  <div key={i} className="rounded-ctl border border-line bg-surface p-2 shadow-warm-1">
                    <TextBone className="text-[12.5px]" widths={["w-12"]} />
                    <TextBone className="mt-0.5 text-[13.5px] font-semibold leading-snug" widths={["w-[80%]"]} />
                    <TextBone className="mt-1 text-[12.5px]" widths={["w-16"]} />
                    <Bone className="mt-1.5 h-9 w-[102px] max-w-full !rounded-full" />
                  </div>
                ))}
                {d >= 5 ? <TextBone className="px-1 py-2 text-[12.5px]" widths={["w-14"]} /> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="divide-y divide-line border-t border-line xl:hidden">
          {[0, 1].map((d) => (
            <div key={d}>
              <TextBone className="bg-surface-2 px-4 py-2 text-[13.5px] font-semibold sm:px-[22px]" widths={["w-32"]} />
              <div className="divide-y divide-line">
                {[0, 1].map((m) => (
                  <div key={m} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 px-4 py-3 sm:px-[22px]">
                    <div className="min-w-0 flex-[1_1_14rem]">
                      <TextBone className="text-[15px] font-semibold leading-snug" widths={["w-[60%]"]} />
                      <TextBone className="mt-0.5 text-[13px]" widths={["w-28"]} />
                    </div>
                    <Bone className="h-9 w-[228px]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <TextBone className="border-t border-line px-4 py-3 text-[13px] sm:px-[22px]" widths={["w-64"]} />
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <div aria-hidden className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-32" description={["w-[320px]"]} divided />
            <div className="px-4 pb-[18px] pt-4 sm:px-[22px]">
              <TextBone className="text-[15px] leading-relaxed" widths={["w-[90%]", "w-[76%]", "w-[48%]"]} />
            </div>
          </div>
          <ListCardSkeleton head="w-48" rows={2} row={{ lead: "tile", title: "w-[64%]", meta: "w-[40%]" }} />
        </div>
        <div className="min-w-0 space-y-5">
          <div aria-hidden className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-24" description={["w-[90%]", "w-[50%]"]} divided right={<ButtonBone label="New rule" size="sm" icon />} />
            <div className="divide-y divide-line">
              {[0, 1].map((i) => (
                <div key={i} className="px-4 py-3.5 sm:px-[22px]">
                  <TextBone className="text-[15px] font-semibold" widths={["w-[70%]"]} />
                  <TextBone className="mt-0.5 text-[13px]" widths={["w-[45%]"]} />
                </div>
              ))}
            </div>
          </div>
          <div aria-hidden className="rounded-card bg-bg-2 px-4 py-[18px] sm:px-6 [&_.mx-bone]:bg-bg-3">
            <TextBone className="display text-[20px]" widths={["w-56"]} />
            <div className="mt-2 space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <TextBone key={i} className="text-[14.5px] leading-relaxed" widths={[i % 2 ? "w-[80%]" : "w-[94%]"]} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
