import { Bone, CardSkeleton, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* The welcome brief while it loads, in the same frame and rhythm as the page. */
export default function Loading() {
  return (
    <Page label="Loading your welcome brief">
      <PageHeadSkeleton />
      <div className="space-y-5">
        <div className="rounded-card border border-line bg-surface px-4 py-[18px] shadow-warm-1 sm:px-[22px]">
          <Bone className="h-4 w-28" />
          <Bone className="mt-4 h-4 w-[80%]" />
          <Bone className="mt-2.5 h-4 w-[64%]" />
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-12">
          <CardSkeleton rows={3} className="xl:col-span-5" />
          <CardSkeleton rows={3} className="xl:col-span-4" />
          <CardSkeleton rows={2} className="lg:col-span-2 xl:col-span-3" />
        </div>
        <CardSkeleton rows={3} />
      </div>
      <span className="sr-only">Loading your welcome brief</span>
    </Page>
  );
}
