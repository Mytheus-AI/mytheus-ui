import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ListCardSkeleton, Page, PageColumns, ShapeBone, TextBone, PageHeadSkeleton } from "@/components/ui/Page";
import "@/styles/meeting-transcript.css";

/* The transcript while the server reads it, from TranscriptView's own frame and classes: the title
   row with Open the meeting, then PageColumns with the transcript card (the search bar, the
   legend, the fixed-height reader of `.tr-row` lines) beside the Speakers and Talk time cards. */

export default function Loading() {
  return (
    <Page label="Loading the transcript">
      <PageHeadSkeleton title="w-56" context={false} actions={<ButtonBone label="Open the meeting" />}>
        <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={["w-[440px]"]} narrow={["w-[30%]"]} />
      </PageHeadSkeleton>

      <PageColumns
        sticky={false}
        aside={
          <>
            <ListCardSkeleton head="w-24" rows={3} row={{ lead: "avatar-sm", title: "w-28", meta: "w-[70%]" }} />
            <div aria-hidden className={cardClass({ flush: true })}>
              <CardHeadSkeleton title="w-24" right={<TextBone className="text-[14px]" widths={["w-24"]} />} />
              <div className="px-4 pb-[18px] sm:px-[22px]">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="md-talk-row tx-talk-row">
                    <TextBone className="text-[14px]" widths={["w-16"]} />
                    <Bone className="h-2 w-full !rounded-full" />
                    <TextBone className="text-[14px]" widths={["w-8"]} />
                  </div>
                ))}
              </div>
            </div>
          </>
        }
      >
        <div aria-hidden className={cardClass({ flush: true, className: "flex flex-col" })}>
          <div className="tx-bar">
            <ShapeBone round className="mt-search tx-search !border-transparent !bg-transparent" />
          </div>
          <div className="tx-legend">
            <TextBone className="font-semibold" widths={["w-40"]} />
          </div>
          <div className="tx-scroll !overflow-hidden">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="tr-row">
                <span className="tr-when">
                  <TextBone className="tr-time !min-h-0 py-0.5 text-[12.5px] font-bold" widths={["w-10"]} />
                </span>
                <span className="tr-who">
                  <Bone className="mx-av sm !rounded-full" />
                  <TextBone className="flex-1 text-[14px] font-semibold" widths={["w-[70%]"]} />
                </span>
                <div className="tr-body">
                  <TextBone className="text-[15px] leading-[1.6]" widths={i % 3 === 1 ? ["w-[94%]", "w-[52%]"] : [i % 2 ? "w-[70%]" : "w-[86%]"]} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageColumns>
    </Page>
  );
}
