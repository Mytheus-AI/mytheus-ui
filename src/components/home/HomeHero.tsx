import type { CSSProperties } from "react";
import Link from "next/link";
import { HandPalm, Microphone, MonitorArrowUp, PaperPlaneRight, PhoneX, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Loop } from "@/components/site/Loop";
import { Chip, Live, Stage, Win, WinBar, Wrap } from "@/components/site/Section";
import { Av, AvStack, Tangle } from "@/components/home/Tangle";
import s from "@/components/home/home.module.css";

/* The home hero: the serif promise with the coral loop (where the page-long line starts), one
   dark action, and below it a Friday standup in Mytheus on a glowing peach stage. The agent panel's
   items arrive once, in order, on load; reduced motion shows them at once. */

const TILES = [
  { name: "Priya", initial: "P", tone: s.sage, speaking: true },
  { name: "Maya", initial: "M", tone: s.peach },
  { name: "Diego", initial: "D", tone: s.ochre },
  { name: "Raj's agent", tone: s.sky },
];

const CARRIED = [
  { text: "Launch targeted for August 12", when: "Tue" },
  { text: "QA needs 2 more days after freeze", when: "Tue" },
  { text: "Pricing locked at $49", when: "Apr 3" },
];

const CONTROLS = [
  { Icon: Microphone, label: "Microphone" },
  { Icon: VideoCamera, label: "Camera" },
  { Icon: MonitorArrowUp, label: "Share screen" },
  { Icon: HandPalm, label: "Raise hand" },
];

const delay = (dl: string) => ({ ["--dl" as string]: dl }) as CSSProperties;

export function HomeHero() {
  return (
    <section className="pb-[clamp(64px,9vw,120px)] pt-[clamp(40px,4.4vw,60px)] text-center">
      <Wrap>
        <h1 className="display display-tight text-[clamp(3.1rem,7.6vw,5.75rem)] leading-[0.98] tracking-[-0.03em]">
          <span className="block">Every meeting,</span>
          <Loop>on repeat.</Loop>
        </h1>
        <p className="mx-auto mt-[clamp(30px,3.8vw,50px)] max-w-[54ch] text-[clamp(1.12rem,1.7vw,1.32rem)] leading-relaxed text-ink-3">
          Everyone gets their own agent. It listens, pulls out the decisions, and carries them into the next meeting, and
          the one after that.
        </p>
        <div className="mt-[26px] flex flex-wrap items-center justify-center gap-x-[26px] gap-y-3.5">
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-[background-color,box-shadow,transform] hover:-translate-y-px hover:bg-pill-2 hover:shadow-warm-2"
          >
            Get started free
          </Link>
          <a
            href="#how"
            className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
          >
            See how it works
          </a>
        </div>
        <p className="mt-[18px] text-[15.5px] text-ink-3">Free to start. No bot in the room. Every answer cited.</p>

        <Stage glow className="mt-[clamp(36px,4.6vw,60px)] text-left">
          <Win label="A Friday standup in Mytheus. Priya asks whether the launch date was ever settled. Her agent answers: August 12, decided on Tuesday in the Q3 launch sync, with one conflict still open.">
            <WinBar
              title="Friday standup"
              meta={<Live>Live, 09:32</Live>}
              right={
                <AvStack
                  label="Priya, Maya, Diego and Raj's agent"
                  people={[
                    { tone: "sage", initial: "P" },
                    { tone: "peach", initial: "M" },
                    { tone: "ochre", initial: "D" },
                    { tone: "accent", agent: true },
                  ]}
                />
              }
            />
            <div className="grid min-[821px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
              {/* the call */}
              <div className="grid content-start gap-3.5 p-3 min-[821px]:p-[18px]">
                <div className="grid grid-cols-2 gap-2.5">
                  {TILES.map((t) => (
                    <div key={t.name} className={`${s.tile} ${t.tone} ${t.speaking ? s.speaking : ""}`}>
                      <span className={`${s.face} font-display text-[clamp(1.2rem,2.6vw,2rem)] font-medium text-ink`}>
                        {t.initial ?? <Tangle className="w-[64%]" />}
                      </span>
                      <span
                        className={`${s.tag} absolute bottom-2.5 left-2.5 rounded-full px-[0.7em] py-[0.2em] text-[13px] font-semibold text-ink`}
                      >
                        {t.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  className={`${s.seq} rounded-ctl border border-line bg-surface-2 px-4 py-3 text-[1.02rem] leading-[1.4] text-ink`}
                  style={delay("1.7s")}
                >
                  <b className="mr-2 font-semibold">Priya</b>Did we ever settle the launch date?
                </p>
                <div className="hidden justify-self-center gap-1.5 rounded-full bg-pill p-1.5 min-[821px]:flex">
                  {CONTROLS.map(({ Icon, label }) => (
                    <span key={label} title={label} className={`${s.ctrlKey} grid h-10 w-10 place-items-center rounded-full text-pill-on`}>
                      <Icon size={19} />
                    </span>
                  ))}
                  <span title="Leave" className="grid h-10 w-[58px] place-items-center rounded-full bg-priority-high text-pill-on">
                    <PhoneX size={19} />
                  </span>
                </div>
              </div>

              {/* your agent */}
              <div className="grid content-start gap-3 border-t border-line bg-surface-2 px-3 py-3.5 min-[821px]:border-l min-[821px]:border-t-0 min-[821px]:p-[18px]">
                <div className="flex items-center gap-2.5 font-semibold text-ink">
                  <Av tone="accent" agent />
                  Your agent
                  <Chip className="ml-auto">Listening</Chip>
                </div>
                <div className={`${s.seq} rounded-ctl border border-line bg-surface px-4 py-3.5`} style={delay("2.4s")}>
                  <small className="block text-[13.5px] text-ink-3">Priya asked</small>
                  <q className="mb-2.5 mt-0.5 block font-display text-[1.15rem] italic leading-[1.3] text-ink-2">
                    Did we ever settle the launch date?
                  </q>
                  <p className="font-semibold leading-[1.35] text-ink">Yes. August 12, decided on Tuesday.</p>
                  <Chip tone="ok" className="mt-2.5">
                    Sourced from Q3 launch sync, Tuesday
                  </Chip>
                </div>
                <div className={`${s.seq} rounded-ctl border border-line bg-surface px-4 py-3.5`} style={delay("3s")}>
                  <Chip tone="high" className="mb-2">
                    Still open
                  </Chip>
                  <p className="font-semibold leading-[1.35] text-ink">August 12 collides with the QA window.</p>
                </div>
                <div className={s.seq} style={delay("3.5s")}>
                  <h3 className="mb-1.5 mt-1 text-[13.5px] font-semibold text-ink-3">Carried into this meeting</h3>
                  <ul>
                    {CARRIED.map((c) => (
                      <li
                        key={c.text}
                        className="flex items-baseline gap-[9px] border-t border-line py-[0.44em] text-[15px] leading-[1.35] text-ink before:h-[7px] before:w-[7px] before:flex-none before:-translate-y-px before:rounded-full before:bg-signal-line before:content-['']"
                      >
                        {c.text}
                        <span className="ml-auto whitespace-nowrap pl-2.5 text-[13.5px] text-ink-3">{c.when}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="hidden items-center justify-between gap-2.5 rounded-ctl border border-line-2 bg-surface py-2.5 pl-3.5 pr-3 text-[15px] text-ink-3 min-[821px]:flex">
                  Ask about anything said in a past meeting
                  <PaperPlaneRight size={18} className="flex-none text-ink-3" />
                </div>
              </div>
            </div>
          </Win>
        </Stage>
      </Wrap>
    </section>
  );
}
