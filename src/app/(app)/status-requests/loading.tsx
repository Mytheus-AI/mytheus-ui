import { Bone } from "@/components/app/PageHead";

/* Shaped like /status-requests: the title row, the waiting card with one-line answer rows, the
   answered card, and the side explainer. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your status requests" className="mx-auto w-full max-w-[1360px]">
      <div className="pb-7 pt-2">
        <Bone className="h-9 w-56" />
        <Bone className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="px-[22px] pb-3 pt-[18px]">
              <Bone className="h-4 w-32" />
            </div>
            {[0, 1].map((i) => (
              <div key={i} className="grid gap-3 border-t border-line px-[22px] py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div>
                  <Bone className="h-4 w-3/5" />
                  <Bone className="mt-2 h-3 w-48" />
                </div>
                <div className="flex gap-2">
                  <Bone className="h-11 w-[260px]" />
                  <Bone className="h-11 flex-1 xl:w-[280px] xl:flex-none" />
                  <Bone className="h-11 w-20" />
                </div>
              </div>
            ))}
          </div>
          <Bone className="h-40 w-full !rounded-card" />
        </div>
        <Bone className="h-64 w-full !rounded-card" />
      </div>
      <span className="sr-only">Loading your status requests</span>
    </div>
  );
}
