import { Card } from "@/components/ui/Card";
import { Bone, SkeletonSection, TextBone, PageHeadSkeleton } from "@/components/ui/Page";

/* Connecting the extension while it loads, in the page's own 1360px frame: the title row, then the
   connect card beside the 380px "Signed in as" card from lg. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading Capture" className="mx-auto w-full max-w-[1360px]">
      {/* PageHead's row; the long title wraps to two lines on a phone */}
      <PageHeadSkeleton title="w-[min(380px,85%)]" titleNarrow={["w-[40%]"]} context={false}>
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[96%]", "w-[20%]"]} narrow={["w-[60%]"]} />
      </PageHeadSkeleton>
      <div aria-hidden className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col gap-3">
            <TextBone className="display text-[22px]" widths={["w-72"]} />
            <TextBone className="text-[15px] leading-relaxed" widths={["w-[95%]", "w-[55%]"]} />
            <div>
              <Bone className="h-11 w-44" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <TextBone className="text-[15px] font-semibold" widths={["w-24"]} />
          <TextBone className="mt-1.5 text-[17px] font-semibold" widths={["w-48"]} />
          <TextBone className="mt-4 text-[14.5px] leading-relaxed" widths={["w-[95%]", "w-[90%]", "w-[50%]"]} />
        </Card>
      </div>
    </SkeletonSection>
  );
}
