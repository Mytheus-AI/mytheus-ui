import { cardClass } from "@/components/ui/Card";
import { Bone, CardHeadSkeleton, ChipBone, Page, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* The digest while it loads, from the page's own frame: PageHead's row (the title, the week's
   summary, the "next one arrives" line, and on the right the round week picker and the settings
   button), the topics row, then DigestSections' grid: four section cards two up from lg and the
   promises card across. */
export default function Loading() {
  return (
    <Page label="Loading your digest">
      <PageHeadSkeleton
        title="w-72" context={false}
        actions={
          <>
          <Bone className="h-10 w-[149px] !rounded-full" />
          <Bone className="h-11 w-11" />
          </>
        }
      >
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[420px]"]} />
        <TextBone className="mt-1 text-[14px]" widths={["w-60"]} />
      </PageHeadSkeleton>
      <div aria-hidden className="mb-6 flex flex-wrap items-center gap-2">
        <TextBone className="text-[14px] font-semibold" widths={["w-[76px]"]} />
        <ChipBone label="pricing" />
        <ChipBone label="launch plan" />
        <TextBone className="text-[15px]" widths={["w-[103px]"]} />
      </div>
      <div aria-hidden className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {[2, 1, 2, 1, 2].map((rows, i) => (
          <div key={i} className={cardClass({ flush: true, className: i === 4 ? "lg:col-span-2" : "" })}>
            <CardHeadSkeleton title="w-44" right={<Bone className="h-[23px] w-8 !rounded-full" />} divided />
            <div className="divide-y divide-line">
              {Array.from({ length: rows }, (_, r) => (
                <div key={r} className="px-4 py-3.5 sm:px-[22px]">
                  <TextBone className="text-[15px] font-semibold leading-snug" widths={[r % 2 ? "w-[52%]" : "w-[72%]"]} />
                  <div className="mt-1 flex items-center gap-2">
                    <TextBone className="text-[13px]" widths={["w-24"]} />
                    <ChipBone label="pricing" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}
