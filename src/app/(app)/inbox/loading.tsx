import { Bone, Page, PageHeadSkeleton, ShapeBone, TextBone } from "@/components/ui/Page";

/* The Inbox while it loads, from InboxView's own frame: the title row with its two actions, the
   four filter pills (the real labels, so each pill is its real width), one flush list card that
   opens on a group head, and the keyboard hint under it. */
const FILTERS: [string, number][] = [
  ["All", 4],
  ["Needs review", 2],
  ["Updates I owe", 0],
  ["Notifications", 2],
];

export default function Loading() {
  return (
    <Page label="Loading your inbox">
      <PageHeadSkeleton title="w-28" context={["w-[440px]"]} narrow={["w-[60%]"]} action={["Weekly digest", "Mark all read"]} />
      <div aria-hidden className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map(([f, n]) => (
          <ShapeBone key={f} round className="inline-flex h-9 items-center gap-2 rounded-full border border-transparent px-3.5 text-[14px] font-semibold">
            {f}
            {n ? <span className="tabular-nums">{n}</span> : null}
          </ShapeBone>
        ))}
      </div>
      <InboxListSkeleton />
      <TextBone className="mt-3 text-[12.5px]" widths={["w-[560px]"]} narrow={["w-[50%]"]} />
    </Page>
  );
}

function InboxListSkeleton() {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="divide-y divide-line">
        <div className="flex items-center gap-2.5 bg-surface-2 px-4 py-2.5 sm:px-[22px]">
          <TextBone className="text-[14px] font-semibold" widths={["w-28"]} />
          <Bone className="h-[23px] w-7 !rounded-full" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3.5 px-4 py-4 sm:gap-4 sm:px-[22px]">
            <Bone className="mt-0.5 h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <TextBone className="text-[12.5px] font-semibold" widths={["w-32"]} />
              <TextBone className="mt-0.5 text-[15px] leading-snug" widths={[i % 2 ? "w-[54%]" : "w-[68%]"]} />
              <TextBone className="mt-1.5 text-[14px] leading-relaxed" widths={["w-[80%]"]} />
              <TextBone className="mt-1 text-[12.5px]" widths={["w-24"]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
