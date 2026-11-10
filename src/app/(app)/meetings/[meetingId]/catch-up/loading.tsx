import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* Skeleton for the catch-up while the server reads it. Mirrors the final layout (title row, the
   summary band, three columns of cards) on the shared frame, so nothing jumps when the content
   arrives. */
export default function Loading() {
  return (
    <Page label="Loading the catch-up">
      <PageHeadSkeleton action />
      <Bone className="mb-5 h-[96px] w-full !rounded-hero" />
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
        {[0, 1, 2].map((c) => (
          <div key={c} className={`flex min-w-0 flex-col gap-5 xl:gap-6 ${c === 2 ? "md:col-span-2 xl:col-span-1" : ""}`}>
            <CardSkeleton rows={2} />
            <CardSkeleton rows={1} />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading the catch-up</span>
    </Page>
  );
}
