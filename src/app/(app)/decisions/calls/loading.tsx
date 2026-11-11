import { cardClass } from "@/components/ui/Card";
import { Bone, CardHeadSkeleton, ListCardSkeleton, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* How good are our calls while it loads, from CallsReport's own frame: the title row with Time
   machine, then the report's two columns (the side column drops under the main one below lg): the
   headline card with the hit rate and the seven counts, calibration, by type and by team; beside
   them your bets waiting, the failing assumptions and the lessons. */

export default function Loading() {
  return (
    <Page label="Loading how good our calls are">
      <PageHeadSkeleton title="w-72" context={["w-[580px]", "w-[260px]"]} narrow={["w-[60%]"]} action={["Time machine"]} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-5">
          <div aria-hidden className={cardClass()}>
            <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div>
                <TextBone className="display text-[clamp(44px,6vw,64px)] leading-none" widths={["w-32"]} />
                <TextBone className="mt-2 max-w-[28ch] text-[14px]" widths={["w-48", "w-28"]} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 min-[520px]:grid-cols-4">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i}>
                    <TextBone className="text-[12.5px] font-semibold" widths={["w-14"]} />
                    <TextBone className="mt-0.5 text-[22px] font-semibold" widths={["w-8"]} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden className={cardClass({ flush: true })}>
            <CardHeadSkeleton title="w-[min(380px,80%)]" description={["w-[70%]"]} divided />
            <div className="px-4 pb-[18px] pt-4 sm:px-[22px]">
              <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
                <Bone className="h-[220px] w-full" />
                <TextBone className="text-[14px] leading-relaxed" widths={["w-[90%]", "w-[70%]", "w-[84%]", "w-[50%]"]} />
              </div>
            </div>
          </div>
          <ListCardSkeleton head="w-40" rows={3} row={{ title: "w-[40%]", meta: null, chip: "4 of 6" }} />
          <ListCardSkeleton head="w-24" rows={2} row={{ title: "w-[36%]", meta: null, chip: "3 of 5" }} />
        </div>
        <div className="grid min-w-0 gap-5">
          <ListCardSkeleton head="w-36" rows={3} row={{ title: "w-[80%]", meta: "w-[40%]" }} />
          <ListCardSkeleton head="w-52" rows={2} row={{ title: "w-[76%]", meta: "w-[34%]" }} />
        </div>
      </div>
    </Page>
  );
}
