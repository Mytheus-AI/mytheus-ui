import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ChipBone, Page, TextBone, PageHeadSkeleton } from "@/components/ui/Page";
import "@/styles/meeting-brain.css";

/* The catch-up while the server reads it, from the page's own frame: the title row (the meeting's
   title, its date, Open the meeting, the Catch-up chip), the summary band (`.cu-lead`), then the
   page's three columns: Now yours and Your questions, Decided and the notes, the agenda. */

export default function Loading() {
  return (
    <Page label="Loading the catch-up">
      <PageHeadSkeleton title="w-56" context={false} actions={<ButtonBone label="Open the meeting" />}>
        <p className="mt-2 text-[15px] leading-normal">
          <LabelBone className="inline-flex items-center gap-2" icon={18}>
            Tuesday, Nov 10, 30 min
          </LabelBone>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ChipBone label="Catch-up" className="pl-[30px]" />
        </div>
      </PageHeadSkeleton>

      <div aria-hidden className="cu-lead">
        <div className="cu-lead-text">
          <TextBone className="cu-sentence" widths={["w-[92%]", "w-[58%]"]} />
        </div>
        <dl className="cu-stats">
          {[
            ["Now yours", "2"],
            ["Decided", "1"],
            ["Agenda", "3 of 4"],
          ].map(([dt, dd]) => (
            <div key={dt}>
              <dt>
                <LabelBone>{dt}</LabelBone>
              </dt>
              <dd>
                <LabelBone>{dd}</LabelBone>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div aria-hidden className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <ItemsCard title="w-28" rows={2} />
          <ItemsCard title="w-32" rows={2} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <ItemsCard title="w-24" rows={2} />
          <ItemsCard title="w-28" rows={1} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 md:col-span-2 xl:col-span-1 xl:gap-6">
          <ItemsCard title="w-24" rows={3} />
        </div>
      </div>
    </Page>
  );
}

/** A flush Card with its head and a short list (`.cu-own-list` rhythm: 12px rows, hairlines). */
function ItemsCard({ title, rows }: { title: string; rows: number }) {
  return (
    <div className={cardClass({ flush: true })}>
      <CardHeadSkeleton title={title} />
      <div className="px-4 pb-[18px] sm:px-[22px]">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-0.5 border-line py-3 [&+&]:border-t">
            <TextBone className="text-[15px] font-semibold leading-[1.4]" widths={[i % 2 ? "w-[62%]" : "w-[80%]"]} />
            <TextBone className="text-[12.5px]" widths={["w-20"]} />
          </div>
        ))}
      </div>
    </div>
  );
}


/** A label's own text, invisible, with a bone over it: the exact box of the text it stands for. */
function LabelBone({ children, className = "relative inline-block", icon = 0 }: { children: string; className?: string; icon?: number }) {
  return (
    <span className={`relative ${className}`}>
      {icon ? <span style={{ width: icon, height: icon }} /> : null}
      <span className="invisible">{children}</span>
      <Bone className="absolute inset-x-0 top-1/2 h-[0.72em] -translate-y-1/2" />
    </span>
  );
}
