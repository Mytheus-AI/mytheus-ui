import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ListCardSkeleton, RowSkeleton, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* The time machine while it loads, in its default "as of a date" shape, from TimeMachine's own
   frame: the title row with How good are our calls, the controls card (the three modes, the topic
   field, the date, the scrubber and the jumps), then the snapshot: where things stood (six counts),
   and what was decided beside the open promises and goals. */

const MODES = ["As of a date", "Compare two dates", "Follow a topic"];
const JUMPS = ["Today", "A month ago", "A quarter ago", "Six months ago", "A year ago"];

export default function Loading() {
  return (
    <Page label="Loading the time machine">
      <PageHeadSkeleton title="w-52" context={["w-[580px]", "w-[240px]"]} narrow={["w-[60%]", "w-[30%]"]} action={["How good are our calls"]} />
      <div className="grid gap-5">
        <div aria-hidden className={cardClass({ clip: false, className: "grid gap-5" })}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-0.5 rounded-ctl bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3">
              {MODES.map((m) => (
                <span key={m} className="inline-flex h-9 items-center justify-center rounded-ctl px-3.5 text-[14px] font-semibold max-sm:px-2 max-sm:text-[13px]">
                  <span className="invisible">{m}</span>
                </span>
              ))}
            </div>
            <Bone className="h-11 min-w-0 flex-[1_1_280px] sm:max-w-[420px]" />
          </div>
          <div className="grid gap-4">
            <TextBone className="display text-[clamp(24px,3vw,30px)] leading-tight" widths={["w-72"]} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <TextBone className="text-[13px] font-semibold" widths={["w-10"]} />
                <div className="flex items-center gap-1.5">
                  <Bone className="h-9 w-9" />
                  <Bone className="h-9 w-[150px]" />
                  <Bone className="h-9 w-9" />
                </div>
              </div>
              <div className="relative mt-3 pb-6">
                <Bone className="my-[9px] h-[3px] w-full !rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {JUMPS.map((j) => (
                <ButtonBone key={j} label={j} size="sm" />
              ))}
            </div>
          </div>
        </div>

        <div aria-hidden className="grid gap-5">
          <div className={cardClass()}>
            <TextBone className="display text-[22px] leading-tight" widths={["w-52"]} />
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 min-[560px]:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i}>
                  <TextBone className="text-[12.5px] font-semibold" widths={["w-24"]} />
                  <TextBone className="mt-0.5 text-[24px] font-semibold" widths={["w-8"]} />
                </div>
              ))}
            </div>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className={cardClass({ flush: true })}>
              <CardHeadSkeleton title="w-56" description={["w-64"]} divided />
              <div className="divide-y divide-line">
                {[0, 1].map((i) => (
                  <div key={i} className="px-4 py-4 sm:px-[22px]">
                    <TextBone className="text-[12.5px] font-semibold" widths={["w-40"]} />
                    <TextBone className="mt-1.5 text-[17px] font-semibold leading-snug" widths={["w-[60%]"]} />
                    <TextBone className="mt-1.5 text-[15px]" widths={["w-[70%]"]} />
                    <Bone className="mt-3 h-[62px] w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid min-w-0 gap-5">
              <div className={cardClass({ flush: true })}>
                <CardHeadSkeleton title="w-32" description={["w-[80%]"]} divided />
                <div className="divide-y divide-line">
                  {[0, 1].map((i) => (
                    <RowSkeleton key={i} title="w-[80%]" meta="w-[50%]" className="py-3" />
                  ))}
                </div>
              </div>
              <ListCardSkeleton head="w-16" rows={2} row={{ title: "w-[60%]", meta: "w-[36%]", chip: "Active", className: "py-3" }} />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
