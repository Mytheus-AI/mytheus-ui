import { Bone } from "@/components/ui/Page";

/* /ask while it loads, in the page's own frame: the history rail (New question, search, a few
   rows) and the conversation column with the face, the greeting and six starter cards, so nothing
   moves when the page arrives. */
export default function AskLoading() {
  return (
    <div className="-mx-4 -mb-12 -mt-1 flex h-[calc(100dvh-68px)] min-h-[480px] sm:-mx-6 lg:-mx-8" aria-busy="true" aria-label="Loading Ask Myte">
      <div className="hidden w-[272px] shrink-0 space-y-2.5 border-r border-line px-3 pt-4 lg:block">
        <Bone className="h-11 w-full rounded-ctl" />
        <Bone className="h-10 w-full rounded-ctl" />
        <div className="space-y-2 pt-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Bone key={i} className="h-8 w-full rounded-ctl" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 border-b border-line" />
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center px-4 pt-[clamp(8px,4vh,48px)]">
          <Bone className="h-[136px] w-[136px] rounded-full" />
          <Bone className="mt-5 h-8 w-[min(460px,90%)] rounded-ctl" />
          <Bone className="mt-3 h-5 w-[min(360px,80%)] rounded-ctl" />
          <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} className="h-[64px] rounded-card" />
            ))}
          </div>
        </div>
        <div className="mx-auto w-full max-w-[720px] px-4 pb-5">
          <Bone className="h-[104px] w-full rounded-hero" />
        </div>
      </div>
    </div>
  );
}
