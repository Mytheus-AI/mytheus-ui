import { Bone } from "@/components/app/PageHead";

/* Skeleton shaped like the Tasks list: title row with the view switch, filter chips, then two
   grouped cards with their surface-2 heads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading tasks" className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-7 pt-2">
        <div className="min-w-0">
          <Bone className="h-9 w-32" />
          <Bone className="mt-3 h-4 w-60 max-w-full" />
        </div>
        <Bone className="h-11 w-48 !rounded-full" />
      </div>
      <div className="mb-5 flex gap-2">
        {[0, 1, 2].map((i) => (
          <Bone key={i} className="h-10 w-28 !rounded-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {[3, 2].map((rows, g) => (
          <div key={g} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="flex h-12 items-center gap-2.5 border-b border-line bg-surface-2 px-5">
              <Bone className="h-4 w-24" />
            </div>
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 border-b border-line px-5 py-4 last:border-b-0">
                <Bone className="h-6 w-6 shrink-0 !rounded-full" />
                <div className="flex-1">
                  <Bone className="h-4 w-3/5" />
                  <Bone className="mt-2 h-3 w-1/4" />
                </div>
                <Bone className="hidden h-6 w-24 !rounded-full sm:block" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading tasks</span>
    </div>
  );
}
