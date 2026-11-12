import { cardClass } from "@/components/ui/Card";
import { ButtonBone, ChipBone, Page, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* A meeting's Myte collaboration log while it loads, from the page's own frame (without this it
   would inherit the meeting's skeleton): the title row with Open the meeting, the four counts
   (StatCard's shape), then the log card: a table from md, a list of rows below it. */

export default function Loading() {
  return (
    <Page label="Loading Myte collaboration">
      <PageHeadSkeleton title="w-72" context={false} actions={<ButtonBone label="Open the meeting" />}>
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[600px]", "w-[580px]", "w-[120px]"]} narrow={["w-[70%]", "w-[40%]"]} />
      </PageHeadSkeleton>
      <div aria-hidden className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cardClass({ className: "min-w-0" })}>
              <TextBone className="text-[12.5px] font-semibold" widths={["w-24"]} />
              <TextBone className="display mt-2 text-[30px] leading-none" widths={["w-12"]} />
            </div>
          ))}
        </div>
        <div className={cardClass({ flush: true })}>
          <div className="hidden md:block">
            <div className="flex gap-6 bg-surface-2 px-5 py-2.5">
              {["w-10", "w-28", "w-14", "w-16", "w-12", "w-14"].map((w, i) => (
                <TextBone key={i} className="text-[12.5px] font-semibold" widths={[w]} />
              ))}
              <TextBone className="ml-auto text-[12.5px] font-semibold" widths={["w-14"]} />
            </div>
            <div className="divide-y divide-line">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-6 px-5 py-3.5">
                  <TextBone className="text-[12.5px]" widths={["w-10"]} />
                  <TextBone className="flex-[2] text-[14px]" widths={["w-[70%]"]} />
                  <TextBone className="flex-1 text-[14px]" widths={["w-[60%]"]} />
                  <TextBone className="flex-1 text-[14px]" widths={["w-[70%]"]} />
                  <TextBone className="flex-1 text-[14px]" widths={["w-[50%]"]} />
                  <ChipBone label="Answered" />
                  <TextBone className="text-[14px]" widths={["w-12"]} />
                </div>
              ))}
            </div>
          </div>
          <div className="divide-y divide-line md:hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="px-4 py-4 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <TextBone className="flex-1" widths={["w-[60%]"]} />
                  <ChipBone label="Answered" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  {[0, 1, 2, 3].map((c) => (
                    <div key={c}>
                      <TextBone widths={["w-12"]} />
                      <TextBone widths={["w-20"]} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}
