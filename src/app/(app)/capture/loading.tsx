import { Bone } from "@/components/app/PageHead";

/* Shaped like /capture: the title row, the captured-calls list beside the setup column. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading Capture" className="mx-auto w-full max-w-[1360px]">
      <div className="pb-7 pt-2">
        <Bone className="h-9 w-36" />
        <Bone className="mt-3 h-4 w-[28rem] max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
        <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
          <div className="flex h-12 items-center border-b border-line bg-surface-2 px-5">
            <Bone className="h-4 w-32" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
              <Bone className="hidden h-4 w-24 sm:block" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-6 w-20 !rounded-full" />
            </div>
          ))}
        </div>
        <div className="space-y-5">
          <Bone className="h-72 w-full !rounded-card" />
          <Bone className="h-56 w-full !rounded-card" />
        </div>
      </div>
      <span className="sr-only">Loading Capture</span>
    </div>
  );
}
