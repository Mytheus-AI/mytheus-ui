/* A brain section while it loads: a title, then two cards at roughly their real sizes, so the
   section list beside it stays put and nothing jumps when the data lands. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading the company brain" className="motion-safe:animate-pulse">
      <div className="h-8 w-56 max-w-full rounded-full bg-bg-2" />
      <div className="mt-3 h-4 w-[28rem] max-w-full rounded-full bg-bg-2" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-[420px] rounded-card bg-bg-2" />
        <div className="hidden h-[260px] rounded-card bg-bg-2 xl:block" />
      </div>
      <span className="sr-only">Loading the company brain</span>
    </div>
  );
}
