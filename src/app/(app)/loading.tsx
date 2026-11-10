import { Bone } from "@/components/app/PageHead";

/* Calm skeleton fallback for every (app) screen: the title row, then white cards on the stage,
   in the same rhythm as a real page. Bones pulse only when motion is allowed. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="mx-auto max-w-[1240px]">
      <div className="pb-7 pt-2">
        <Bone className="h-9 w-56 max-w-full" />
        <Bone className="mt-3 h-4 w-[420px] max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-warm-1">
            <Bone className="h-4 w-32" />
            <div className="mt-5 flex flex-col gap-4">
              {[0, 1, 2].map((r) => (
                <div key={r} className="flex flex-col gap-2">
                  <Bone className="h-4 w-[82%]" />
                  <Bone className="h-3 w-[44%]" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="rounded-card border border-line bg-surface p-5 shadow-warm-1 md:col-span-2">
          <Bone className="h-4 w-40" />
          <Bone className="mt-5 h-4 w-[70%]" />
          <Bone className="mt-3 h-4 w-[55%]" />
        </div>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
