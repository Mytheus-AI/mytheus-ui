import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";
import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, ChipBone, TextBone } from "@/components/ui/Page";

/* Integrations while they load, in IntegrationsPanel's shape: two groups ("For your Mytes",
   "Share and export"), each a heading and three cards of the one card shape (icon and chip, name,
   two lines of description and More, one footer action). The tracker card also has its Jira and
   Linear choice above its action. */

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,236px),1fr))] gap-4";

function ProviderBone({ tracker = false }: { tracker?: boolean }) {
  return (
    <div aria-hidden className={cardClass({ clip: false, className: "flex h-full min-w-0 flex-col" })}>
      <div className="flex items-start justify-between gap-3">
        <Bone className="h-10 w-10 shrink-0" />
        <ChipBone label="Ready to connect" />
      </div>
      <TextBone className="mt-3.5 text-[17px] font-semibold leading-snug" widths={["w-32"]} />
      <div className="mt-1">
        <TextBone className="text-[14px] leading-relaxed" widths={["w-[95%]", "w-[70%]"]} />
        <TextBone className="mt-0.5 text-[13px]" widths={["w-10"]} />
      </div>
      <div className="mt-auto flex min-h-9 flex-wrap items-center gap-2 pt-4">
        {tracker ? <Bone className="h-10 w-full !rounded-full" /> : null}
        <ButtonBone label="Connect" size="sm" />
      </div>
    </div>
  );
}

function GroupBone({ title, tracker = false }: { title: string; tracker?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden>
        <TextBone className="display text-[20px]" widths={[title]} />
        <TextBone className="mt-0.5 text-[14.5px] leading-relaxed" widths={["w-[60%]"]} narrow={["w-[40%]"]} />
      </div>
      <div className={GRID}>
        <ProviderBone />
        <ProviderBone />
        <ProviderBone tracker={tracker} />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <SettingsPanelSkeleton label="Loading integrations" bar={{ title: "w-32", context: ["w-[520px]"], narrow: ["w-[50%]"] }}>
      <div className="grid gap-6">
        <GroupBone title="w-40" tracker />
        <GroupBone title="w-44" />
      </div>
    </SettingsPanelSkeleton>
  );
}
