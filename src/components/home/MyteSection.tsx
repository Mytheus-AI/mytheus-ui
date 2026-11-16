import { InView } from "@/components/site/InView";
import { MyteVeil } from "@/components/home/fx/MyteVeil";
import s from "@/components/home/home.module.css";

/* Meet your Myte: a character sheet. The portrait (one of the Myte avatar renders) is printed
   as a coral dither and clears wherever you move, the way a Myte sees the decision through the
   noise of a meeting. Four numbered traits sit beside it like the notes on a spec sheet, and
   arrive in order when the section scrolls in. Every trait is a real capability (see
   src/lib/marketing/features.ts); a Myte's name and face are set in Settings. */

const TRAITS = [
  {
    n: "01",
    title: "Tuned to your role",
    body: "It knows what you do, so an engineer and a product manager leave the same meeting with different notes.",
  },
  {
    n: "02",
    title: "Private by default",
    body: "What it captures is yours. A note, a decision or an action is shared only when you choose to share it.",
  },
  {
    n: "03",
    title: "Asks the other Mytes",
    body: "When it needs context, it asks the Myte of whoever knows, and brings back the meeting where it was said.",
  },
  {
    n: "04",
    title: "Never saves without you",
    body: "It proposes and you confirm. Nothing is saved, assigned or shared until you tap Confirm.",
  },
];

export function MyteSection() {
  return (
    <section id="myte" data-snap="" data-snap-label="Your Myte" className="py-[clamp(64px,9vw,120px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center">
      <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <InView className="grid items-center gap-x-[clamp(32px,5vw,72px)] gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)]">
          <div data-snap-in="" className="relative">
            <div className={`${s.veilFrame} relative aspect-square overflow-hidden rounded-hero`}>
              <MyteVeil src="/home/myte-cat.webp" />
              <span className="pointer-events-none absolute bottom-3.5 left-3.5 rounded-full bg-[color-mix(in_srgb,var(--surface)_85%,transparent)] px-3 py-1 text-[13px] font-semibold text-ink-2 backdrop-blur">
                Move over the print to see it clearly
              </span>
            </div>
            <p className="mt-3.5 text-center font-display text-[1.05rem] text-ink-3">One Myte of many. Yours gets the name and the face you give it.</p>
          </div>

          <div data-snap-in="" style={{ ["--si" as string]: 2 }}>
            <h2 className="display max-w-[12ch] text-[clamp(2.4rem,5.4vw,4.2rem)] leading-[0.98]">Meet your Myte.</h2>
            <p className="mt-5 max-w-[46ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
              Every meeting is noise: crosstalk, half sentences, three topics at once. Your Myte sits in all of it and keeps the one line that
              matters to you.
            </p>
            <ol className="mt-[clamp(26px,3.4vw,40px)]">
              {TRAITS.map((t, i) => (
                <li
                  key={t.n}
                  className={`${s.trait} grid grid-cols-[44px_minmax(0,1fr)] gap-x-3 border-t border-line py-4 last:border-b`}
                  style={{ ["--dl" as string]: `${0.15 + i * 0.12}s` }}
                >
                  <span className="pt-[3px] font-display text-[1.05rem] tabular-nums text-signal-ink">{t.n}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold text-ink">{t.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-3">{t.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </InView>
      </div>
    </section>
  );
}
