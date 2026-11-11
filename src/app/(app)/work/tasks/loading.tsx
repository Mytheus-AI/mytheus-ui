import { Bone, ButtonBone, SectionBarSkeleton, ShapeBone, SkeletonSection, TextBone } from "@/components/ui/Page";

/* The Tasks tab while it loads, inside the My work layout (its title and tabs stay put), from
   TasksView's own frame: the SectionBar with the List/Board switch and New task, the three filter
   pills, then the list view's grid (two open groups side by side from xl, Completed folded across
   the full width under them). */
const FILTERS = ["Mine", "This week", "High priority"];

function Group({ rows, wide = false, folded = false }: { rows: number; wide?: boolean; folded?: boolean }) {
  return (
    <div aria-hidden className={`relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1 ${wide ? "xl:col-span-2" : ""}`}>
      <div className={`flex h-12 items-center gap-2.5 bg-surface-2 px-4 sm:px-5 ${folded ? "" : "border-b border-line"}`}>
        <span className="h-3.5 w-3.5" />
        <TextBone className="text-[14px] font-semibold" widths={["w-24"]} />
        <Bone className="h-[23px] w-7 !rounded-full" />
      </div>
      {folded ? null : (
        <div className="divide-y divide-line">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex min-h-[64px] flex-wrap items-start gap-x-3.5 gap-y-2 px-4 py-3 sm:flex-nowrap sm:items-center sm:px-5">
              <div className="mt-0.5 pl-2 sm:mt-0">
                <Bone className="h-6 w-6 !rounded-full" />
              </div>
              <div className="flex min-w-0 basis-[calc(100%-3.5rem)] flex-col gap-0.5 sm:basis-0 sm:flex-1">
                <TextBone className="text-[15px] font-semibold leading-snug" widths={[i % 2 ? "w-[52%]" : "w-[68%]"]} />
                <TextBone className="text-[12.5px]" widths={["w-32"]} />
              </div>
              <div className="flex basis-full flex-wrap items-center gap-2 pl-[3.25rem] sm:basis-auto sm:flex-nowrap sm:gap-3 sm:pl-0">
                <span className="flex sm:w-8 sm:justify-center">
                  <Bone className="h-7 w-7 !rounded-full" />
                </span>
                <span className="flex sm:w-[132px]">
                  <Bone className="h-[23px] w-24 !rounded-full" />
                </span>
                <span className="flex sm:w-[92px] sm:justify-end" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading your tasks">
      <SectionBarSkeleton
        context={["w-56"]}
        actions={
          <>
            <span className="inline-flex shrink-0 items-center gap-0.5 rounded-ctl bg-bg-2 p-1">
              {["List", "Board"].map((t) => (
                <ShapeBone key={t} className="inline-flex h-9 items-center gap-2 px-3.5 text-[14px] font-semibold">
                  <span className="inline-block h-4 w-4" />
                  {t}
                </ShapeBone>
              ))}
            </span>
            <ButtonBone label="New task" icon />
          </>
        }
      />
      <div aria-hidden className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <ShapeBone key={f} round className="inline-flex h-10 items-center gap-2 rounded-full border border-transparent px-3.5 text-[14px] font-semibold">
            <span className="inline-block h-[15px] w-[15px]" />
            {f}
            <span className="rounded-full px-1.5 text-[12.5px] leading-[18px]">2</span>
          </ShapeBone>
        ))}
      </div>
      <div>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          <Group rows={3} />
          <Group rows={3} />
          <Group rows={0} wide folded />
        </div>
      </div>
    </SkeletonSection>
  );
}
