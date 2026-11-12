import { Bone, ButtonBone, CardHeadSkeleton, ChipBone, Page, ShapeBone, TextBone, pageTitleClass } from "@/components/ui/Page";

/* A person's page while it loads, from the page's own frame: the phone-only back link, the header
   row (the 80px face, name, role and team chips, Email), then two columns from lg (1.35 to 1):
   About and Recent meetings beside Skills and what their Myte listens for. */
function Panel({ title, description, children }: { title: string; description?: boolean; children: React.ReactNode }) {
  return (
    <div aria-hidden className="relative overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <CardHeadSkeleton title={title} description={description ? ["w-[80%]"] : undefined} />
      {children}
    </div>
  );
}

function Chips({ labels }: { labels: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-[18px] sm:px-[22px]">
      {labels.map((l) => (
        <ChipBone key={l} label={l} />
      ))}
    </div>
  );
}

export default function Loading() {
  return (
    <Page label="Loading this person">
      <ShapeBone className="inline-flex min-h-[40px] items-center gap-1.5 self-start pr-2 text-[14px] font-semibold sm:hidden">
        <span className="inline-block h-[15px] w-[15px]" />
        People
      </ShapeBone>
      <div aria-hidden className="flex flex-wrap items-center gap-x-6 gap-y-5 pb-7 pt-2">
        <Bone className="h-20 w-20 shrink-0 !rounded-full" />
        <div className="min-w-0 flex-[1_1_280px]">
          <TextBone className={pageTitleClass} widths={["w-56"]} />
          <TextBone className="mt-1.5 text-[15px]" widths={["w-32"]} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ChipBone label="Engineering" />
            <ChipBone label="Platform" />
          </div>
        </div>
        <ButtonBone label="Email Maya" icon />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="w-16">
            <TextBone className="max-w-[68ch] px-4 pb-[18px] text-[15px] leading-relaxed sm:px-[22px]" widths={["w-[90%]", "w-[60%]"]} />
          </Panel>
          <Panel title="w-36" description>
            <div className="divide-y divide-line border-t border-line">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex min-h-[56px] items-center gap-3.5 px-4 py-3 sm:px-[22px]">
                  <Bone className="h-9 w-9 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <TextBone className="text-[14px] font-semibold" widths={["w-40"]} />
                    <TextBone className="text-[12.5px]" widths={["w-24"]} />
                  </span>
                  <ChipBone label="Ended" />
                  <span className="h-3.5 w-3.5 shrink-0" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="w-14">
            <Chips labels={["Roadmaps", "SQL", "Pricing"]} />
          </Panel>
          <Panel title="w-52" description>
            <Chips labels={["Launch dates", "Hiring plan"]} />
          </Panel>
        </div>
      </div>
    </Page>
  );
}
