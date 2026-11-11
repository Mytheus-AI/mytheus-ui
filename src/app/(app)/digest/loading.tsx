import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* The digest's skeleton in the page's own shape: title row with the week picker, the topic chips,
   then two columns of section cards. */
export default function Loading() {
  return (
    <Page label="Loading your digest">
      <PageHeadSkeleton action />
      <div className="mb-6 flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-7 w-24 !rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
      </div>
      <span className="sr-only">Loading your digest</span>
    </Page>
  );
}
