/* The agent page while it loads: the stage, the two cards and the form, at their real sizes so
   nothing jumps when the data arrives. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading your agent" className="mx-auto w-full max-w-[1080px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="h-[300px] animate-pulse rounded-hero bg-bg-2 motion-reduce:animate-none md:h-[232px]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[280px] animate-pulse rounded-card bg-bg-2 motion-reduce:animate-none" />
        <div className="h-[280px] animate-pulse rounded-card bg-bg-2 motion-reduce:animate-none" />
      </div>
      <div className="h-[360px] animate-pulse rounded-card bg-bg-2 motion-reduce:animate-none" />
    </div>
  );
}
