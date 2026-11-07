/* Skeleton shaped like the decision log: header, filters, a month heading and three cards. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading decisions"
      className="mx-auto max-w-[1240px] motion-safe:animate-pulse"
    >
      <div className="h-9 w-48 rounded-lg bg-bg-2" />
      <div className="mt-3 h-4 w-96 max-w-full rounded-full bg-bg-2" />
      <div className="mt-6 flex gap-3">
        <div className="h-10 flex-1 rounded-pill bg-bg-2" />
        <div className="hidden h-10 w-64 rounded-pill bg-bg-2 sm:block" />
      </div>
      <div className="mt-6 h-6 w-40 rounded-lg bg-bg-2" />
      <div className="mt-4 flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-5">
            <div className="flex gap-2">
              <div className="h-6 w-24 rounded-full bg-bg-2" />
              <div className="h-6 w-16 rounded-full bg-bg-2" />
            </div>
            <div className="mt-4 h-5 w-3/5 rounded-full bg-bg-2" />
            <div className="mt-3 h-4 w-5/6 rounded-full bg-bg-2" />
            <div className="mt-4 h-3 w-1/3 rounded-full bg-bg-2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading decisions</span>
    </div>
  );
}
