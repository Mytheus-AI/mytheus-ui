import { buttonClass } from "@/components/ui/Button";
import { Bone, ChipBone, LoadingLabel, ShapeBone, TextBone } from "@/components/ui/Page";
import "@/styles/meeting-hub.css";
import "@/styles/meeting-brain.css";

/* A meeting while it loads, from the meeting page's own frame and classes (`.mx-page.md`): the
   back link, the head (chips, the serif title, the when and who line, the actions), then `.md-cols`
   with the two-column pair and the people rail.

   The page has two shapes: scheduled or live (When, your choice and brief; the agenda and what
   your Myte will do; Invited) and ended (the recap, the agenda and the thread; Took part, plus
   the briefing, minutes and recording sections above the columns when you were in it). This is
   the frame both share, drawn with the scheduled cards: the head and the three columns sit in the
   same place either way. */

export default function Loading() {
  return (
    <div aria-busy className="mx-page md">
      <LoadingLabel label="Loading the meeting" />
      <div aria-hidden className="mx-back">
        <span className="h-4 w-4" />
        <TextBone className="text-[14px] font-semibold" widths={["w-[84px]"]} />
      </div>

      <div aria-hidden className="mx-head">
        <div className="mx-head-main">
          <div className="md-chips">
            <ChipBone label="Scheduled" />
            <ChipBone label="Hosted by Maya" />
          </div>
          <TextBone className="mx-title" widths={["w-[min(420px,80%)]"]} />
          <div className="md-meta">
            <MetaBone w="w-[150px]" />
            <MetaBone w="w-[210px]" />
            <span>
              <span className="mx-avs">
                {[0, 1, 2, 3].map((i) => (
                  <Bone key={i} className="mx-av sm !rounded-full" />
                ))}
              </span>
              <TextBone className="text-[15px]" widths={["w-[64px]"]} />
            </span>
          </div>
        </div>
        <div className="mx-actions">
          <ShapeBone round className="mx-btn is-outline !border-transparent !bg-transparent">
            <span className="h-[18px] w-[18px]" />
            Invite people
          </ShapeBone>
          <ShapeBone className={buttonClass({ variant: "ghost" })}>
            <span className="h-[18px] w-[18px]" />
            Join meeting
          </ShapeBone>
        </div>
      </div>

      <div aria-hidden className="md-cols">
        <div className="md-pair">
          <div className="md-col">
            <section className="mx-card mx-card-pad">
              <CardHead title="w-14" />
              <div className="md-when">
                <Bone className="md-date !rounded-[var(--radius-pill)] !bg-bg-2" />
                <span className="md-when-text block min-w-0 flex-1">
                  <TextBone className="text-[17px] font-semibold" widths={["w-[80%]"]} />
                  <TextBone className="text-[15px]" widths={["w-[64%]"]} />
                </span>
              </div>
            </section>
            <ListCard title="w-36" rows={3} />
          </div>
          <div className="md-col">
            <ListCard title="w-20" rows={3} note />
            <section className="mx-card mx-card-pad">
              <CardHead title="w-48" />
              <TextBone className="mx-help" widths={["w-[92%]", "w-[60%]"]} />
              <div className="md-plan">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-[34px_minmax(0,1fr)] items-start gap-3 border-line py-2.5 [&+&]:border-t">
                    <Bone className="h-[34px] w-[34px] !rounded-full" />
                    <TextBone className="pt-1.5 text-[15px] leading-normal" widths={["w-[88%]", "w-[50%]"]} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
        <div className="md-col md-rail">
          <section className="mx-card mx-card-pad">
            <CardHead title="w-16" note />
            <div className="md-people">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 border-line py-2.5 [&+&]:border-t">
                  <Bone className="h-9 w-9 shrink-0 !rounded-full" />
                  <span className="min-w-0 flex-1">
                    <TextBone className="text-[15px] font-semibold" widths={["w-28"]} />
                    <TextBone className="text-[14px]" widths={["w-40"]} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** `.mx-card-head`: the 17px title, and a note on the right when the card has one. */
function CardHead({ title, note = false }: { title: string; note?: boolean }) {
  return (
    <div className="mx-card-head">
      <TextBone className="flex-1 text-[17px] font-semibold" widths={[title]} />
      {note ? <TextBone className="text-[14px]" widths={["w-16"]} /> : null}
    </div>
  );
}

/** A card of a few two-line items (your choice, the agenda). */
function ListCard({ title, rows, note = false }: { title: string; rows: number; note?: boolean }) {
  return (
    <section className="mx-card mx-card-pad">
      <CardHead title={title} note={note} />
      <div className="flex flex-col">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="border-line py-2.5 [&+&]:border-t">
            <TextBone className="text-[15px] font-semibold" widths={[i % 2 ? "w-[58%]" : "w-[72%]"]} />
            <TextBone className="text-[14px]" widths={["w-[40%]"]} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** A `.md-meta` item: the 18px icon and a line of text. */
function MetaBone({ w }: { w: string }) {
  return (
    <span>
      <span className="h-[18px] w-[18px]" />
      <TextBone className="text-[15px]" widths={[w]} />
    </span>
  );
}
