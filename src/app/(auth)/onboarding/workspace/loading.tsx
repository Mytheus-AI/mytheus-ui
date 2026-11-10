/* The setup while its data loads: the rail and the step card at their real sizes. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading the setup" className="min-h-[100dvh] bg-bg">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 motion-safe:animate-pulse sm:px-8">
        <div className="h-[44px] w-40 rounded-full bg-bg-2" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
          <div className="hidden h-[320px] rounded-card bg-bg-2 lg:block" />
          <div className="h-[520px] rounded-hero bg-bg-2" />
          <div className="hidden h-[240px] rounded-card bg-bg-2 xl:block" />
        </div>
      </div>
      <span className="sr-only">Loading the setup</span>
    </div>
  );
}
