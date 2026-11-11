import { Bone, CardSkeleton } from "@/components/ui/Page";

/* Inside the My work layout (its title and tabs stay put): the ledger's own shape, the week bar
   first, then the grouped list and the side column. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your promise ledger" className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Bone className="h-4 w-72 max-w-[60%]" />
        <Bone className="h-11 w-40 rounded-ctl" />
      </div>
      <div className="rounded-card border border-line bg-surface p-5">
        <Bone className="h-5 w-32" />
        <Bone className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-[52px] rounded-ctl" />
          ))}
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={4} />
      </div>
      <span className="sr-only">Loading your promise ledger</span>
    </div>
  );
}
