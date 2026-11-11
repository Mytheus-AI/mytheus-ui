import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, ChipBone, Page, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* The decision log while it loads, from DecisionsLog's own frame: the title row (the in force and
   replaced chips, Time machine and How good are our calls), the search with the status switch, the
   meeting filter and the count, then a month heading over two columns of decision cards (one
   column below xl). */

const STATUS: [string, string][] = [
  ["All", "8"],
  ["In force", "6"],
  ["Replaced", "2"],
];

export default function Loading() {
  return (
    <Page label="Loading decisions">
      <PageHeadSkeleton
        title="w-44" context={false}
        actions={
          <>
          <div className="flex flex-wrap items-center gap-2">
            <ChipBone label="6 in force" className="pl-[30px]" />
            <ChipBone label="2 replaced" className="pl-[30px]" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonBone label="Time machine" size="sm" icon />
            <ButtonBone label="How good are our calls" size="sm" icon />
          </div>
          </>
        }
      >
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[560px]", "w-[220px]"]} narrow={["w-[40%]"]} />
      </PageHeadSkeleton>

      <div aria-hidden className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Bone className="h-11 min-w-0 flex-1 basis-64" />
          <div className="inline-flex h-11 shrink-0 items-center gap-0.5 rounded-ctl bg-bg-2 p-1 max-sm:grid max-sm:w-full max-sm:grid-cols-3">
            {STATUS.map(([label, n]) => (
              <span key={label} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-ctl px-3.5 text-[14px] font-semibold">
                <span className="invisible">{label}</span>
                <span className="invisible min-w-[18px] text-[12.5px]">{n}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Bone className="h-10 min-w-0 flex-1 basis-48 !rounded-full sm:max-w-[300px]" />
          <TextBone className="text-[14px] max-sm:w-full sm:ml-auto" widths={["w-24"]} />
        </div>
      </div>

      <div aria-hidden className="mt-2">
        <div className="-mx-1 flex items-baseline gap-3 px-1 pb-2.5 pt-5">
          <TextBone className="display text-[22px]" widths={["w-40"]} />
          <TextBone className="text-[14px]" widths={["w-20"]} />
        </div>
        <div className="grid grid-cols-1 gap-3.5 pb-2 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cardClass({ className: "flex flex-col gap-3" })}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[12.5px]">
                <ChipBone label="In force" className="pl-[30px]" />
                <TextBone className="font-medium" widths={["w-32"]} />
                <TextBone className="ml-auto" widths={["w-12"]} />
              </div>
              <TextBone className="text-[17px] font-semibold leading-snug" widths={[i % 2 ? "w-[64%]" : "w-[82%]"]} />
              <TextBone className="max-w-[64ch] text-[14px] leading-relaxed" widths={["w-[92%]", "w-[58%]"]} />
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

