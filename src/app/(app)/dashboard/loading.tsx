import { Bone } from "@/components/app/PageHead";

/* Skeleton for Home, in the same two-column rhythm as the page so nothing jumps when the real
   content streams in. Bones pulse only when motion is allowed. */

function CardSkeleton({ rows, className = "" }: { rows: number; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface p-5 shadow-warm-1 ${className}`}>
      <Bone className="h-4 w-32" />
      <div className="mt-5 flex flex-col gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-4 w-[85%]" />
            <Bone className="h-3 w-[45%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading your dashboard" className="mx-auto max-w-[1240px]">
      <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-5 pb-6 pt-2 min-[721px]:pb-7">
        <div className="min-w-0 flex-[1_1_380px]">
          <Bone className="h-9 w-72 max-w-full" />
          <Bone className="mt-3 h-4 w-[420px] max-w-full" />
        </div>
        <div className="grid flex-[1_1_100%] grid-cols-3 gap-6 min-[721px]:flex min-[721px]:flex-[0_0_auto]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-2 min-[721px]:px-6">
              <Bone className="h-9 w-10" />
              <Bone className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(300px,368px)]">
        <div className="flex min-w-0 flex-col gap-7">
          <div className="rounded-hero border border-line bg-bg-2 p-7">
            <div className="flex justify-between gap-4">
              <Bone className="h-7 w-40 !rounded-full bg-bg-3" />
              <Bone className="h-11 w-24 bg-bg-3" />
            </div>
            <Bone className="mt-6 h-9 w-[min(380px,90%)] bg-bg-3" />
            <Bone className="mt-4 h-4 w-[min(260px,70%)] bg-bg-3" />
            <Bone className="mt-6 h-12 w-36 bg-bg-3" />
          </div>
          <div>
            <Bone className="mb-3 h-7 w-36" />
            <CardSkeleton rows={2} />
          </div>
          <CardSkeleton rows={3} />
        </div>
        <div className="grid grid-cols-1 items-start gap-5 min-[721px]:grid-cols-2 min-[1101px]:flex min-[1101px]:flex-col">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} className="min-[721px]:col-span-2 min-[1101px]:col-span-1" />
        </div>
      </div>

      <span className="sr-only">Loading your dashboard</span>
    </div>
  );
}
