import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* The Inbox's skeleton in the page's own shape: title row, filter chips, one list card. */
export default function Loading() {
  return (
    <Page label="Loading your inbox">
      <PageHeadSkeleton />
      <div className="mb-5 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-9 w-28 !rounded-full" />
        ))}
      </div>
      <CardSkeleton rows={6} />
      <span className="sr-only">Loading your inbox</span>
    </Page>
  );
}
