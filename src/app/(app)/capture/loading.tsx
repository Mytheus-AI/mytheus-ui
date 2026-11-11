import { Card } from "@/components/ui/Card";
import { Bone, ChipBone, PageHeadSkeleton, SkeletonSection, TextBone } from "@/components/ui/Page";

/* Capture while it loads, in the page's own 1360px frame: the title row with the download button,
   then the captured-calls list (its surface-2 head and a typical four calls) beside the setup
   column (the four steps, what it records) at 360px from lg and 400px from xl. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading Capture" className="mx-auto w-full max-w-[1360px]">
      <PageHeadSkeleton title="w-36" context={["w-[96%]", "w-[50%]"]} narrow={["w-[80%]", "w-[40%]"]} action={["Download for Chrome"]} />
      <div aria-hidden className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="flex min-h-12 items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3">
              <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
              <TextBone className="text-[13.5px]" widths={["w-12"]} />
            </div>
            <div className="divide-y divide-line">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto_auto]">
                  <TextBone className="text-[13.5px] font-semibold" widths={["w-24"]} />
                  <TextBone className="col-span-2 text-[16px] font-semibold sm:col-span-1" widths={[i % 2 ? "w-[50%]" : "w-[70%]"]} />
                  <TextBone className="text-[14px]" widths={["w-24"]} />
                  <ChipBone label="Done" className="justify-self-end" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <Card className="p-6">
            <TextBone className="display text-[21px]" widths={["w-36"]} />
            <div className="mt-4 flex flex-col gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <Bone className="h-7 w-7 !rounded-full" />
                  <div>
                    <TextBone className="text-[15px] font-semibold" widths={["w-44"]} />
                    <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[95%]", "w-[60%]"]} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <TextBone className="display text-[21px]" widths={["w-36"]} />
            <div className="mt-4 flex flex-col gap-3.5 text-[14.5px] leading-relaxed">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3">
                  <Bone className="mt-0.5 h-5 w-5" />
                  <TextBone widths={["w-[95%]", i % 2 ? "w-[40%]" : "w-[75%]"]} />
                </div>
              ))}
            </div>
            <TextBone className="mt-5 text-[13.5px] leading-relaxed" widths={["w-[95%]", "w-[70%]"]} />
          </Card>
        </div>
      </div>
    </SkeletonSection>
  );
}
