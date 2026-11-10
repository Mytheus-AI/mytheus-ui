import { Bone, CardSkeleton, Page } from "@/components/ui/Page";

/* The agent page while it loads, in the same frame: the portrait, the form and the side column at
   their real sizes, so nothing jumps when the data arrives. */
export default function Loading() {
  return (
    <Page className="pt-2" label="Loading your agent">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="flex items-center gap-8 rounded-hero bg-bg-2 px-7 py-7">
            <Bone className="h-[148px] w-[148px] shrink-0 !rounded-full bg-bg-3" />
            <div className="min-w-0 flex-1">
              <Bone className="h-[34px] w-56 max-w-full bg-bg-3" />
              <Bone className="mt-3 h-4 w-[70%] bg-bg-3" />
              <Bone className="mt-5 h-20 w-full bg-bg-3" />
            </div>
          </div>
          <CardSkeleton rows={4} />
        </div>
        <div className="hidden space-y-5 xl:block">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
        </div>
      </div>
      <span className="sr-only">Loading your agent</span>
    </Page>
  );
}
