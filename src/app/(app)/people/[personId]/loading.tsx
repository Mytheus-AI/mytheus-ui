import { Bone, CardSkeleton, Page } from "@/components/ui/Page";

/* Skeleton shaped like a person's page, from the same frame: the face and name row, then two
   columns of cards (one column below lg). */
export default function Loading() {
  return (
    <Page label="Loading profile">
      <div className="flex flex-wrap items-center gap-6 pb-7 pt-2">
        <Bone className="h-20 w-20 !rounded-full" />
        <div className="min-w-0 flex-1">
          <Bone className="h-[34px] w-56 max-w-full" />
          <Bone className="mt-3 h-4 w-40" />
        </div>
        <Bone className="h-11 w-36" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={2} />
      </div>
      <span className="sr-only">Loading profile</span>
    </Page>
  );
}
