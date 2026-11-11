import { MEETINGS_TABS } from "@/components/app/nav";
import { cardClass } from "@/components/ui/Card";
import { Bone, ButtonBone, CardHeadSkeleton, ChipBone, Page, PageColumns, PageHeadSkeleton, ShapeBone, TabsSkeleton, TextBone } from "@/components/ui/Page";
import "@/styles/meeting-hub.css";

/* The meetings hub while it loads, from the hub's own frame and classes: the title row with New
   meeting, the All meetings / Listening tabs, then PageColumns with the status tabs, the search and
   one day of meeting rows (`.mt-row`, the real row grid) beside the calendar and the week. */

const STATUS_TABS: [string, string][] = [
  ["Upcoming", "4"],
  ["Live", "0"],
  ["Past", "12"],
];

export default function Loading() {
  return (
    <Page label="Loading your meetings">
      <PageHeadSkeleton title="w-44" context={["w-[520px]"]} narrow={["w-[40%]"]} action={["New meeting"]} />
      <TabsSkeleton labels={MEETINGS_TABS.map((t) => t.label)} className="mb-5" />
      <PageColumns sticky={false} aside={<HubAside />}>
        <div aria-hidden>
          <div className="mt-tools">
            <div className="mt-tabs">
              {STATUS_TABS.map(([label, n]) => (
                <span key={label} className="mt-tab">
                  <span className="invisible">{label}</span>
                  <span className="mx-count invisible">{n}</span>
                </span>
              ))}
            </div>
            <ShapeBone round className="mt-search !border-transparent !bg-transparent" />
          </div>
          <div className="mt-group">
            <div className="mt-group-head">
              <TextBone className="font-display text-[22px] font-semibold" widths={["w-24"]} />
              <TextBone className="text-[14px]" widths={["w-28"]} />
            </div>
            <div className={cardClass({ flush: true })}>
              {[0, 1, 2, 3].map((i) => (
                <MeetingRowSkeleton key={i} wide={i % 2 === 0} />
              ))}
            </div>
          </div>
        </div>
      </PageColumns>
    </Page>
  );
}

/** One `.mt-row`: time, title and meta, avatars, status, the row's one action. */
function MeetingRowSkeleton({ wide }: { wide: boolean }) {
  return (
    <div className="mt-row">
      <div className="mt-time">
        <TextBone className="text-[15px] font-bold leading-[1.25]" widths={["w-[64px]"]} />
        <TextBone className="text-[12.5px]" widths={["w-12"]} />
      </div>
      <div className="mt-body">
        <span className={`mt-title relative ${wide ? "w-[62%]" : "w-[46%]"}`}>
          <span className="invisible">Weekly sync</span>
          <Bone className="absolute inset-x-0 top-1/2 h-[0.72em] -translate-y-1/2" />
        </span>
        <div className="mt-meta">
          <MetaBone label="Hosted by you" />
          <MetaBone label="4 people invited" />
        </div>
      </div>
      <div className="mx-avs mt-avs">
        {[0, 1, 2, 3].map((a) => (
          <Bone key={a} className="mx-av sm !rounded-full" />
        ))}
      </div>
      <span className="mt-status">
        <ChipBone label="Scheduled" />
      </span>
      <span className="mt-act">
        <ButtonBone label="Open" size="sm" />
      </span>
    </div>
  );
}

/** A `.mt-meta` item: the 15px icon and the label's own width, as a bone. */
function MetaBone({ label }: { label: string }) {
  return (
    <span className="relative">
      <span className="h-[15px] w-[15px]" />
      <span className="invisible">{label}</span>
      <Bone className="absolute inset-x-0 top-1/2 h-[0.72em] -translate-y-1/2" />
    </span>
  );
}

/** The rail: the month calendar card and the week in numbers. */
function HubAside() {
  return (
    <>
      <div aria-hidden className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-32" right={<Bone className="h-[34px] w-[76px]" />} />
        <div className="px-4 pb-[18px] sm:px-[22px]">
          <div className="cal-grid">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="cal-dow">
                <span className="invisible">M</span>
              </span>
            ))}
            {Array.from({ length: 42 }, (_, i) => (
              <span key={i} className="cal-day">
                <Bone className="h-7 w-7 !rounded-full" />
              </span>
            ))}
          </div>
          <div className="cal-note">
            <TextBone className="text-[14px] leading-[1.4]" widths={["w-48"]} />
          </div>
        </div>
      </div>
      <div aria-hidden className={cardClass({ flush: true })}>
        <CardHeadSkeleton title="w-24" right={<TextBone className="text-[14px]" widths={["w-24"]} />} />
        <div className="px-4 pb-[18px] sm:px-[22px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <TextBone className="text-[14px]" widths={["w-20"]} />
                <TextBone className="text-[22px] font-bold leading-[1.15]" widths={["w-10"]} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
