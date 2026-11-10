import { Bone } from "@/components/app/PageHead";

/* Skeleton shaped like a person's profile: back link, the face and name row, then two columns
   of cards (one column below lg). */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading profile" className="mx-auto max-w-[1240px]">
      <Bone className="mt-2.5 h-4 w-24" />
      <div className="flex flex-wrap items-center gap-6 pb-7 pt-5">
        <Bone className="h-20 w-20 !rounded-full" />
        <div className="min-w-0 flex-1">
          <Bone className="h-9 w-56 max-w-full" />
          <Bone className="mt-3 h-4 w-40" />
        </div>
        <Bone className="h-11 w-36" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {[3, 2].map((rows, i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-5 shadow-warm-1">
            <Bone className="h-4 w-28" />
            <div className="mt-5 flex flex-col gap-4">
              {Array.from({ length: rows }, (_, r) => (
                <Bone key={r} className="h-4 w-[80%]" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading profile</span>
    </div>
  );
}
