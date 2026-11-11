import { Bone, CardHeadSkeleton, ChipBone, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* People while it loads, from the page's own frame: the title row (with the admins' New
   department and New team), then the departments stacked 40px apart, each a serif heading with
   its team count and a grid of team cards (two columns from md, three from 2xl), each card a head
   and rows of people. */
function Team({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <CardHeadSkeleton title="w-28" description={["w-40"]} right={<Bone className="h-10 w-10" />} />
      <div className="divide-y divide-line border-t border-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 sm:px-[22px]">
            <Bone className="h-9 w-9 shrink-0 !rounded-full" />
            <span className="min-w-0 flex-1">
              <TextBone className="text-[15px] font-semibold" widths={["w-32"]} />
              <TextBone className="text-[14px]" widths={["w-44"]} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Department({ teams }: { teams: number }) {
  return (
    <div aria-hidden>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <TextBone className="display text-[22px]" widths={["w-32"]} />
        <ChipBone label="2 teams" />
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: teams }, (_, i) => (
          <Team key={i} rows={3} />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <Page label="Loading people">
      <PageHeadSkeleton title="w-32" context={["w-[620px]", "w-[300px]"]} narrow={["w-[60%]"]} action={["New department", "New team"]} />
      <div className="flex flex-col gap-10">
        <Department teams={2} />
        <Department teams={2} />
      </div>
    </Page>
  );
}
