import { Bone } from "@/components/app/PageHead";

/* Shaped like /promises: the title row, then grouped meeting cards beside the side column. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your promises" className="mx-auto w-full max-w-[1360px]">
      <div className="pb-7 pt-2">
        <Bone className="h-9 w-40" />
        <Bone className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
        <div className="space-y-4">
          {[3, 2].map((rows, g) => (
            <div key={g} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
              <div className="flex h-12 items-center gap-3 border-b border-line bg-surface-2 px-5">
                <Bone className="h-4 w-40" />
              </div>
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 border-b border-line px-5 py-4 last:border-b-0">
                  <Bone className="h-6 w-6 shrink-0 !rounded-full" />
                  <div className="flex-1">
                    <Bone className="h-4 w-3/5" />
                    <Bone className="mt-2 h-3 w-24" />
                  </div>
                  <Bone className="hidden h-9 w-24 sm:block" />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <Bone className="h-[92px] w-full !rounded-card" />
          <Bone className="h-48 w-full !rounded-card" />
        </div>
      </div>
      <span className="sr-only">Loading your promises</span>
    </div>
  );
}
