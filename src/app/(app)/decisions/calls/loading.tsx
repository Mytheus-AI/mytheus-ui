import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* Shaped like the report: the headline card and three sections, the side column of lists. */
export default function Loading() {
  return (
    <Page label="Loading how good our calls are">
      <PageHeadSkeleton action />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Bone className="h-[148px] w-full rounded-card" />
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} />
        </div>
        <div className="grid gap-5">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={3} />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </Page>
  );
}
