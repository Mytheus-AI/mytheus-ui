import { Bone, LoadingLabel } from "@/components/ui/Page";

/* The console while the staff gate is checked. The gate has not answered yet, so this draws only
   the shape of the frame (a sidebar and a content column of bones) and names nothing the console
   contains: someone who turns out not to be staff gets a 404 and has learned nothing. */
export default function Loading() {
  return (
    <div aria-busy className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <LoadingLabel label="Loading" />
      <div aria-hidden className="hidden h-dvh flex-col gap-3 border-r border-line px-5 pt-5 lg:flex">
        <Bone className="h-7 w-32" />
        <Bone className="mt-6 h-4 w-20" />
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-8 w-full" />
        ))}
      </div>
      <div aria-hidden className="px-4 pt-6 sm:px-6 lg:px-10 lg:pt-11">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
          <Bone className="h-9 w-48" />
          <Bone className="h-5 w-full max-w-[560px]" />
          <Bone className="mt-4 h-28 w-full !rounded-card" />
          <Bone className="h-72 w-full !rounded-card" />
        </div>
      </div>
    </div>
  );
}
