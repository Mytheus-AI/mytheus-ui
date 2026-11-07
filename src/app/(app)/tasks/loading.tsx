/* Skeleton shaped like the Tasks list: header, filter chips, two grouped cards. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading tasks"
      className="mx-auto max-w-[1240px] motion-safe:animate-pulse"
    >
      <div className="h-9 w-32 rounded-lg bg-bg-2" />
      <div className="mt-3 h-4 w-56 max-w-full rounded-full bg-bg-2" />
      <div className="mt-6 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-9 w-28 rounded-full bg-bg-2" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-4">
        {[3, 2].map((rows, g) => (
          <div key={g} className="overflow-hidden rounded-card border border-line bg-surface">
            <div className="h-12 border-b border-line bg-bg/50" />
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="flex items-center gap-3.5 border-b border-line px-5 py-4 last:border-b-0">
                <div className="h-6 w-6 shrink-0 rounded-full bg-bg-2" />
                <div className="flex-1">
                  <div className="h-4 w-3/5 rounded-full bg-bg-2" />
                  <div className="mt-2 h-3 w-1/4 rounded-full bg-bg-2" />
                </div>
                <div className="hidden h-6 w-24 rounded-full bg-bg-2 sm:block" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading tasks</span>
    </div>
  );
}
