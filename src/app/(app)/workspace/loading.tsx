import { CardHeadSkeleton, SkeletonSection, ButtonBone, Bone, TextBone } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { FieldRowSkeleton, SectionCardSkeleton, StatCardSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* The Workspace overview while it loads, inside the console layout (its title and tabs stay put):
   the tab's title row with Invite people, the four figures, the company brain card with its
   readiness strip, then the workspace name beside the three quick links. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading the workspace overview" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-28" context={["w-[440px]"]} narrow={["w-[40%]"]} action={<ButtonBone label="Invite people" icon />} />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
      <div aria-hidden className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-36" description={["w-[560px]", "w-48"]} right={<Bone className="h-5 w-48" />} />
        <div className="px-4 pb-[18px] sm:px-[22px]">
          <div className="grid items-center gap-x-6 gap-y-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <TextBone className="display text-[40px] leading-none" widths={["w-24"]} />
            <div className="min-w-0">
              <Bone className="h-3 w-full" />
              <TextBone className="mt-2 text-[14px]" widths={["w-44"]} />
            </div>
            <ButtonBone label="Add a goal" size="sm" />
          </div>
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SectionCardSkeleton title="w-40" description={["w-[80%]"]}>
          <FieldRowSkeleton />
          <div className="border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
            <ButtonBone label="Save name" />
          </div>
        </SectionCardSkeleton>
        <div className="grid gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden className={cardClass({ className: "flex items-start gap-4" })}>
              <Bone className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <TextBone className="text-[17px] font-semibold" widths={["w-32"]} />
                <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[85%]"]} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonSection>
  );
}
