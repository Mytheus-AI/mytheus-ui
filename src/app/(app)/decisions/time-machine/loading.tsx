import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* Shaped like the time machine: the controls card with the scrubber, then the answer. */
export default function Loading() {
  return (
    <Page label="Loading the time machine">
      <PageHeadSkeleton action />
      <Bone className="h-[230px] w-full rounded-card" />
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={3} />
      </div>
      <span className="sr-only">Loading</span>
    </Page>
  );
}
