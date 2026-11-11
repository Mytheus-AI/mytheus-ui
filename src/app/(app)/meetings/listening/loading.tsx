import { Bone, CardSkeleton, Page } from "@/components/ui/Page";

/* Skeleton for Listening, in the page's own frame: the title, the tabs, the week, then the two
   columns, so nothing jumps when the real content arrives. */
export default function ListeningLoading() {
  return (
    <Page label="Loading what your agent listens to">
      <div className="pb-6 pt-2">
        <Bone className="h-9 w-56 max-w-full" />
        <Bone className="mt-3 h-4 w-[460px] max-w-full" />
      </div>
      <div className="mb-5 flex gap-2">
        <Bone className="h-10 w-32" />
        <Bone className="h-10 w-28" />
      </div>
      <div className="rounded-card border border-line bg-surface shadow-warm-1">
        <div className="px-4 py-[18px] sm:px-[22px]">
          <Bone className="h-5 w-32" />
          <Bone className="mt-3 h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface px-4 py-4 sm:px-[22px]">
              <Bone className="h-3 w-16" />
              <Bone className="mt-2 h-7 w-10" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 border-t border-line p-4 xl:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Bone className="h-3 w-12" />
              <Bone className="h-20 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <CardSkeleton rows={2} />
          <CardSkeleton rows={3} />
        </div>
        <CardSkeleton rows={2} />
      </div>
    </Page>
  );
}
