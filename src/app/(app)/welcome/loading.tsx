/* The welcome brief while it loads: the stage and the three columns at their real sizes. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading your welcome brief" className="mx-auto w-full max-w-[1480px] space-y-6 py-2 motion-safe:animate-pulse sm:py-4">
      <div className="h-[260px] rounded-hero bg-bg-2" />
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-12">
        <div className="h-[300px] rounded-card bg-bg-2 xl:col-span-5" />
        <div className="h-[300px] rounded-card bg-bg-2 xl:col-span-4" />
        <div className="h-[200px] rounded-card bg-bg-2 lg:col-span-2 xl:col-span-3 xl:h-[300px]" />
      </div>
      <div className="h-[280px] rounded-card bg-bg-2" />
      <span className="sr-only">Loading your welcome brief</span>
    </div>
  );
}
