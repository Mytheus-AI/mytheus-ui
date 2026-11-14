import { Bone, ChipBone, Page, PageHeadSkeleton, TextBone } from "@/components/ui/Page";

/* People while it loads, from the page's own frame (`components/org/PeopleBoard.tsx`): the title
   row (with the admins' New department and New team), then the departments stacked 48px apart,
   each a serif heading with its team count, two lines of what it does and a hairline, then a grid
   of team cards (one column, two from md, three from xl), each card a head, two lines of
   description and rows of people. */
function Team({ rows }: { rows: number }) {
  return (
    <div aria-hidden className="relative flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="flex items-start gap-3 px-4 pb-3 pt-[18px] sm:px-[22px]">
        <span className="min-w-0 flex-1">
          <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-28"]} />
          <TextBone className="mt-0.5 text-[14px]" widths={["w-40"]} />
        </span>
        <Bone className="h-10 w-10 sm:h-11 sm:w-11" />
      </div>
      <div className="px-4 pb-4 sm:px-[22px]">
        <TextBone className="text-[15px] leading-relaxed" widths={["w-full", "w-[70%]"]} />
      </div>
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
      <div className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <TextBone className="display text-[24px] leading-tight" widths={["w-36"]} />
          <ChipBone label="3 teams" />
        </div>
        <TextBone className="mt-1.5 max-w-[75ch] text-[15px] leading-relaxed" widths={["w-full max-w-[560px]", "w-[60%] max-w-[340px]"]} narrow={["w-[45%]"]} />
      </div>
      <div className="mt-5 grid grid-cols-1 items-start gap-5 md:grid-cols-2">
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
      <PageHeadSkeleton title="w-32" context={["w-[620px]", "w-[300px]"]} narrow={["w-[90%]", "w-[60%]"]} action={["New department", "New team"]} />
      <div className="flex flex-col gap-12">
        <Department teams={3} />
        <Department teams={3} />
      </div>
    </Page>
  );
}
