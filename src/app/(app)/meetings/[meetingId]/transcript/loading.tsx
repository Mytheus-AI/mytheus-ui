/* Skeleton for the transcript while the server reads it. Mirrors the final layout (heading, a
   card with a search bar and lines, a rail) so nothing jumps when the content arrives. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading transcript" className="mx-auto max-w-6xl">
      <div className="pb-6 pt-2 motion-safe:animate-pulse">
        <div className="h-10 w-72 max-w-full rounded-lg bg-bg-2" />
        <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-bg-2" />
      </div>
      <div className="grid items-start gap-6 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-card border border-line bg-surface motion-safe:animate-pulse">
          <div className="border-b border-line p-4">
            <div className="h-11 rounded-pill bg-bg-2" />
          </div>
          <div className="flex flex-col gap-5 p-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-[54px_minmax(0,1fr)] gap-3 min-[700px]:grid-cols-[64px_148px_minmax(0,1fr)]">
                <div className="h-4 w-10 rounded-full bg-bg-2" />
                <div className="h-6 w-28 rounded-full bg-bg-2" />
                <div className="col-span-2 h-10 rounded-lg bg-bg-2 min-[700px]:col-span-1" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-64 rounded-card border border-line bg-surface motion-safe:animate-pulse" />
      </div>
      <span className="sr-only">Loading transcript</span>
    </div>
  );
}
