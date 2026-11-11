import { cardClass, cardPadX } from "@/components/ui/Card";
import { Bone, ChipBone, TextBone } from "@/components/ui/Page";

/* The full BriefingPlayer's skeleton, from the player's own classes: the head (the 64px face, the
   cover line, the serif title, the chips), the line being said (its reserved 3.2em), the controls
   row (back, the 52px play button, forward, the track, the round speed picker) and the transcript
   well with a typical four points. Used by /briefings and /briefings/[briefingId] while they load. */
export function BriefingPlayerSkeleton({ ask = false, points = 4 }: { ask?: boolean; points?: number }) {
  return (
    <div aria-hidden className={cardClass({ flush: true })}>
      <div className={`${cardPadX} pt-5`}>
        <div className="flex flex-wrap items-center gap-4">
          <Bone className="h-16 w-16 shrink-0 !rounded-full" />
          <div className="min-w-0 flex-[1_1_14rem]">
            <TextBone className="text-[13px] font-semibold" widths={["w-40"]} />
            <TextBone className="display text-[22px] leading-tight sm:text-[24px]" widths={["w-[min(320px,90%)]"]} />
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <ChipBone label="3:12 long" />
              <ChipBone label="New" />
            </div>
          </div>
          {ask ? <Bone className="h-9 w-[150px] shrink-0" /> : null}
        </div>
        <div className="display mt-5 min-h-[3.2em] text-[clamp(19px,2.1vw,23px)] leading-snug">
          <TextBone widths={["w-[92%]", "w-[60%]"]} />
        </div>
      </div>
      <div className={`${cardPadX} pb-4 pt-3`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <div className="flex items-center gap-1.5">
            <Bone className="h-11 w-11" />
            <Bone className="h-[52px] w-[52px] !rounded-full" />
            <Bone className="h-11 w-11" />
          </div>
          <div className="flex min-w-[12rem] flex-[1_1_14rem] items-center gap-3">
            <Bone className="h-[6px] flex-1 !rounded-full" />
            <TextBone className="shrink-0 text-[13px] font-semibold" widths={["w-[78px]"]} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Bone className="h-9 w-[76px] !rounded-full" />
          </div>
        </div>
      </div>
      <div className="border-t border-line bg-surface-2 py-2">
        {Array.from({ length: points }, (_, i) => (
          <div key={i} className={cardPadX}>
            <div className="py-2.5">
              <TextBone className="text-[12.5px] font-semibold" widths={["w-24"]} />
              <TextBone className="mt-0.5 text-[15.5px] leading-relaxed" widths={[i % 2 ? "w-[70%]" : "w-[88%]"]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
