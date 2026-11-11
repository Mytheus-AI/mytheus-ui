import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";
import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ChipBone, TextBone } from "@/components/ui/Page";

/* Integrations while they load, in IntegrationsPanel's shape (an admin's view): the calendar and
   Slack cards, the project tracker card, then "Share and export" with its three cards. */
function Provider() {
  return (
    <div aria-hidden className="relative flex flex-col gap-4 overflow-hidden rounded-card border border-line bg-surface px-4 py-[18px] shadow-warm-1 sm:px-[22px]">
      <div className="flex items-start gap-3.5">
        <Bone className="h-[46px] w-[46px] shrink-0" />
        <div className="min-w-0 flex-1">
          <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-32"]} />
          <TextBone className="mt-1 text-[14px] leading-relaxed" widths={["w-[95%]", "w-[60%]"]} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <ChipBone label="Not connected" />
      </div>
      <div className="mt-auto border-t border-line pt-4">
        <ButtonBone label="Connect" />
      </div>
    </div>
  );
}

/* The project tracker card: its two choices, then Connect. */
function Tracker() {
  return (
    <div aria-hidden className={cardClass({ flush: true })}>
      <CardHeadSkeleton title="w-36" description={["w-[90%]", "w-[40%]"]} className="!pb-4" />
      <div className="border-t border-line">
        <div className="flex flex-col gap-4 px-4 py-4 sm:px-[22px] md:py-[18px]">
          <div className="grid gap-2.5">
            {[0, 1].map((i) => (
              <div key={i} className="flex flex-wrap items-start gap-3 rounded-ctl border border-line-2 px-4 py-3.5">
                <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0 !rounded-full" />
                <Bone className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-[1_1_12rem]">
                  <TextBone className="text-[15px] font-semibold" widths={["w-16"]} />
                  <TextBone className="mt-0.5 text-[14px] leading-snug" widths={["w-[80%]"]} />
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-4">
            <ButtonBone label="Connect" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <SettingsPanelSkeleton label="Loading integrations" bar={{ title: "w-32", context: ["w-[580px]", "w-[220px]"], narrow: ["w-[50%]"] }}>
      <div className="grid gap-5">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-5">
          <Provider />
          <Provider />
        </div>
        <Tracker />
        <div className="flex flex-col gap-3">
          <div aria-hidden>
            <TextBone className="display text-[22px]" widths={["w-40"]} />
            <TextBone className="mt-1 max-w-[70ch] text-[15px] leading-relaxed" widths={["w-[90%]"]} narrow={["w-[50%]"]} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-5">
            <Provider />
            <Provider />
            <Provider />
          </div>
        </div>
      </div>
    </SettingsPanelSkeleton>
  );
}
