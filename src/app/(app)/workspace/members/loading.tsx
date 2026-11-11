import { ButtonBone, SkeletonSection } from "@/components/ui/Page";
import { cardClass } from "@/components/ui/Card";
import { NoteSkeleton, TableSkeleton, TitledBarSkeleton } from "@/components/admin/AdminSkeletons";

/* Members while they load, inside the console layout: the tab's title row with Invite people, the
   members table (a face, a name and an email per row), and the note under it. */
export default function Loading() {
  return (
    <SkeletonSection label="Loading members" className="flex flex-col gap-5">
      <TitledBarSkeleton title="w-28" context={["w-[600px]", "w-40"]} narrow={["w-[70%]", "w-[50%]"]} action={<ButtonBone label="Invite people" icon />} />
      <div aria-hidden className={cardClass({ flush: true })}>
        <TableSkeleton rows={5} avatar cols={3} />
      </div>
      <NoteSkeleton lines={["w-[866px] max-w-full"]} narrow={["w-56", "w-40"]} />
    </SkeletonSection>
  );
}
