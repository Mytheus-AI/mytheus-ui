import { Bone, ButtonBone, SkeletonSection, TextBone } from "@/components/ui/Page";
import { TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Plans while it loads, inside the console layout: the title row, the four plan cards (two
   columns from sm, four from xl) with name, blurb, price, five features and the button, then the
   extra credits card. */
function PlanCardBone() {
  return (
    <li className="flex flex-col rounded-card border border-line bg-surface p-5 sm:p-6">
      <TextBone className="text-[19px] font-semibold" widths={["w-20"]} />
      <TextBone className="mt-1 min-h-[2.6em] text-[14px] leading-snug" widths={["w-[90%]", "w-[60%]"]} />
      <Bone className="mt-4 h-9 w-24" />
      <div className="mb-6 mt-5 flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <TextBone key={i} className="text-[14px]" widths={[i % 2 ? "w-[70%]" : "w-[85%]"]} />
        ))}
      </div>
      <ButtonBone label="Upgrade to Pro" className="mt-auto w-full" />
    </li>
  );
}

export default function Loading() {
  return (
    <SkeletonSection label="Loading plans" className="flex flex-col gap-6">
      <TitledBarSkeleton title="w-24" context={["w-[620px]", "w-40"]} narrow={["w-[60%]"]} />
      <ul aria-hidden className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <PlanCardBone key={i} />
        ))}
      </ul>
      <div aria-hidden className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <TextBone className="text-[19px] font-semibold" widths={["w-40"]} />
        <TextBone className="mt-1.5 text-[14.5px]" widths={["w-[60%]"]} />
      </div>
    </SkeletonSection>
  );
}
