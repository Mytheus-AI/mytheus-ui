import { Bone } from "@/components/app/PageHead";

/* Skeleton shaped like the decision log: title row, filters, a month heading and cards. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading decisions" className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-7 pt-2">
        <div className="min-w-0 flex-1">
          <Bone className="h-9 w-44" />
          <Bone className="mt-3 h-4 w-[460px] max-w-full" />
        </div>
        <Bone className="h-7 w-28 !rounded-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Bone className="h-11 min-w-[200px] flex-1" />
        <Bone className="h-11 w-72 max-w-full !rounded-full" />
      </div>
      <Bone className="mt-3 h-11 w-64 max-w-full" />
      <Bone className="mt-7 h-7 w-40" />
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:px-6">
            <div className="flex gap-3">
              <Bone className="h-6 w-24 !rounded-full" />
              <Bone className="h-6 w-36" />
            </div>
            <Bone className="mt-4 h-5 w-3/5" />
            <Bone className="mt-3 h-4 w-5/6" />
            <Bone className="mt-2 h-4 w-2/3" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading decisions</span>
    </div>
  );
}
