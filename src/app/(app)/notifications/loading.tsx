import { Bone } from "@/components/app/PageHead";

/* Shaped like /notifications: title row, the filter, a card of rows, the side explainer. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your notifications" className="mx-auto w-full max-w-[1360px]">
      <div className="pb-7 pt-2">
        <Bone className="h-9 w-48" />
        <Bone className="mt-3 h-4 w-72 max-w-full" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="space-y-4">
          <Bone className="h-11 w-44" />
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="flex h-12 items-center border-b border-line bg-surface-2 px-[22px]">
              <Bone className="h-4 w-16" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-4 border-b border-line px-[22px] py-4 last:border-b-0">
                <Bone className="h-10 w-10 shrink-0" />
                <div className="flex-1">
                  <Bone className="h-3 w-24" />
                  <Bone className="mt-2 h-4 w-3/5" />
                  <Bone className="mt-2 h-10 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <Bone className="h-56 w-full !rounded-card" />
      </div>
      <span className="sr-only">Loading your notifications</span>
    </div>
  );
}
