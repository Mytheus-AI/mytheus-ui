/* Calm skeleton fallback for every (app) screen: neutral blocks in the page's
   spacing rhythm, pulsing only when motion is allowed. */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="mx-auto flex max-w-6xl flex-col gap-10 motion-safe:animate-pulse"
    >
      <div>
        <div className="h-3 w-24 rounded-full bg-bg-2" />
        <div className="mt-4 h-8 w-64 max-w-full rounded-lg bg-bg-2" />
        <div className="mt-3 h-4 w-80 max-w-full rounded-full bg-bg-2" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-card border border-line bg-surface" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 rounded-card border border-line bg-surface" />
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </div>
  );
}
