import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, Page, PageHeadSkeleton, ShapeBone, TextBone } from "@/components/ui/Page";

/* Ask while it loads, from AskView's own frame: the reading width, the title row, the composer box
   (its own classes: the field, the "/" hint and Ask), then the idle panel: the dashed empty state
   and the four "Try asking" cards on the same auto-fill grid. */
export default function Loading() {
  return (
    <Page width="read" label="Loading Ask">
      <PageHeadSkeleton title="w-52" context={["w-[96%]", "w-[40%]"]} narrow={["w-[50%]"]} />
      <div aria-hidden className="flex items-center gap-2 rounded-card border border-line-2 bg-surface py-2 pl-4 pr-2 shadow-warm-1">
        <Bone className="h-[21px] w-[21px] shrink-0 !rounded-full" />
        <div className="flex h-11 min-w-0 flex-1 items-center">
          <Bone className="h-4 w-[70%]" />
        </div>
        <ShapeBone round className="hidden shrink-0 rounded-full border border-transparent px-2 py-0.5 text-[12.5px] font-semibold sm:block">
          /
        </ShapeBone>
        <ButtonBone label="Ask" className="max-[520px]:w-11 max-[520px]:px-0" />
      </div>
      <div aria-hidden className="mt-7">
       <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line-2 bg-surface-2 px-6 py-14 text-center">
          <Bone className="mb-4 h-14 w-[105px]" />
          <TextBone className="display w-full text-[22px] leading-tight" widths={["mx-auto w-[min(380px,90%)]"]} narrow={["mx-auto w-[50%]"]} />
          <TextBone
            className="mt-2 w-full max-w-[46ch] text-[15px] leading-relaxed"
            widths={["mx-auto w-[92%]", "mx-auto w-[96%]", "mx-auto w-[88%]", "mx-auto w-[40%]"]}
            narrow={["mx-auto w-[80%]", "mx-auto w-[60%]"]}
          />
        </div>
        <div>
          <TextBone className="kicker mb-3" widths={["w-20"]} />
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))]">
            {["w-[80%]", "w-[60%]", "w-[85%]", "w-[90%]"].map((w, i) => (
              <div key={i} className={cardClass({ className: "flex min-h-[52px] items-start gap-3 text-[15px] font-semibold" })}>
                <Bone className="mt-0.5 h-[17px] w-[17px] shrink-0" />
                <TextBone className="min-w-0 flex-1" widths={[w]} />
              </div>
            ))}
          </div>
        </div>
       </div>
      </div>
    </Page>
  );
}
