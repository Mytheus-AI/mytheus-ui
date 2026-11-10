import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* Skeleton shaped like the decision log, in the same frame: title row, the search and filters, a
   month heading and two columns of cards. */
export default function Loading() {
  return (
    <Page label="Loading decisions">
      <PageHeadSkeleton action />
      <div className="flex flex-wrap gap-3">
        <Bone className="h-11 min-w-[200px] flex-1" />
        <Bone className="h-11 w-72 max-w-full" />
      </div>
      <Bone className="mt-3 h-11 w-64 max-w-full" />
      <Bone className="mt-7 h-7 w-40" />
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} rows={1} />
        ))}
      </div>
      <span className="sr-only">Loading decisions</span>
    </Page>
  );
}
