import { Bone, CardSkeleton } from "@/components/ui/Page";

/* A thread's skeleton, in the thread's shape: the two decisions, then the conversation and the
   three ways to settle it. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading the thread">
      <Bone className="mb-5 h-8 w-72 max-w-full" />
      <div className="grid gap-3 md:grid-cols-2">
        <CardSkeleton rows={2} />
        <CardSkeleton rows={2} />
      </div>
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={3} />
      </div>
      <span className="sr-only">Loading the thread</span>
    </div>
  );
}
