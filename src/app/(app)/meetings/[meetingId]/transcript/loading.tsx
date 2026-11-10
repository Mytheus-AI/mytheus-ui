import { Bone, CardSkeleton, Page, PageColumns, PageHeadSkeleton } from "@/components/ui/Page";

/* Skeleton for the transcript while the server reads it. Mirrors the final layout (title row, the
   transcript card with its search bar and lines, the rail of cards) on the shared frame, so nothing
   jumps when the content arrives. */
export default function Loading() {
  return (
    <Page label="Loading transcript">
      <PageHeadSkeleton action />
      <PageColumns
        sticky={false}
        aside={
          <>
            <CardSkeleton rows={2} />
            <CardSkeleton rows={3} />
          </>
        }
      >
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <div className="border-b border-line px-4 py-3.5">
            <Bone className="h-11 w-full" />
          </div>
          <div className="flex flex-col gap-5 px-4 py-5 sm:px-[22px]">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 md:grid-cols-[76px_156px_minmax(0,1fr)]">
                <Bone className="h-3 w-11" />
                <Bone className="hidden h-3 w-28 md:block" />
                <Bone className="h-3.5" />
              </div>
            ))}
          </div>
        </div>
      </PageColumns>
      <span className="sr-only">Loading transcript</span>
    </Page>
  );
}
