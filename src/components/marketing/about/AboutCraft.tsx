import Link from "next/link";
import { CheckSquareOffset, FlowArrow, Graph, Lightning, Path, Waveform } from "@phosphor-icons/react/dist/ssr";
import { Chip, Section, SectionHead, Stage, Win, WinBar, Wrap } from "@/components/site/Section";
import { IconFacts } from "@/components/company/Facts";

/* What we build: the flagship on an ochre stage beside a small window of what it does (the
   context an agent carries into a meeting), then the six disciplines as one aligned grid. */

const DISCIPLINES = [
  {
    icon: <FlowArrow />,
    title: "Agentic systems",
    body: "Agents that plan, call tools, and hand work to each other, never losing the thread between steps.",
  },
  {
    icon: <Waveform />,
    title: "Realtime pipelines",
    body: "Streams over batches. Captions, tokens, and events render the moment they happen, not after.",
  },
  {
    icon: <Path />,
    title: "Motion-obsessed interfaces",
    body: "Calm, physical UI where every state change earns its animation, and steps aside when asked.",
  },
  {
    icon: <Graph />,
    title: "Cross-meeting memory",
    body: "Retrieval that links what was said today to what was decided months ago, across every room.",
  },
  {
    icon: <Lightning />,
    title: "Ship-fast sprints",
    body: "Small crew, short loops. Scope tight, ship, learn, repeat. Momentum is the methodology.",
  },
  {
    icon: <CheckSquareOffset />,
    title: "Guardrailed autonomy",
    body: "Nothing persists silently. The system proposes, a person confirms: autonomy with a hand on the wheel.",
  },
];

const CARRIED = [
  { text: "Launch targeted for August 12", when: "Tue" },
  { text: "QA needs 2 more days after freeze", when: "Tue" },
  { text: "Pricing locked at $49", when: "Apr 3" },
];

export function AboutCraft() {
  return (
    <Section cross id="what-we-build">
      <Wrap>
        <SectionHead
          title="Agentic software that remembers."
          lead="We design AI systems that act, listening, deciding, and carrying context forward, and we sweat the interface as hard as the inference."
        />

        <Stage tone="ochre">
          <div className="grid items-center gap-[clamp(24px,4vw,56px)] md:grid-cols-2">
            <div className="px-1 md:px-2">
              <p className="kicker">Flagship</p>
              <h3 className="display mt-2 text-[clamp(2rem,4vw,2.75rem)]">Mytheus</h3>
              <p className="mt-4 max-w-[44ch] text-[17px] leading-relaxed text-ink-2">
                A meeting platform where every participant brings a Myte, a personal AI agent that captures the room live
                and remembers it across every meeting after.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-[background-color,box-shadow] duration-150 hover:bg-pill-2 hover:shadow-warm-2"
              >
                Explore Mytheus
              </Link>
            </div>
            <Win label="A Myte's panel in Mytheus listing three things carried into this meeting from earlier ones: launch targeted for August 12, QA needs 2 more days after freeze, both from Tuesday, and pricing locked at $49 from April 3.">
              <WinBar title="Your Myte" right={<Chip>Listening</Chip>} />
              <div className="bg-surface-2 px-5 py-5">
                <p className="text-[14px] font-semibold text-ink-3">Carried into this meeting</p>
                <ul className="mt-2">
                  {CARRIED.map((c) => (
                    <li key={c.text} className="flex items-baseline gap-3 border-t border-line py-2.5 text-[15px] leading-snug text-ink">
                      <span className="h-[7px] w-[7px] flex-none -translate-y-px rounded-full bg-signal-line" />
                      {c.text}
                      <span className="ml-auto whitespace-nowrap pl-2 text-[14px] text-ink-3">{c.when}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Win>
          </div>
        </Stage>

        <IconFacts items={DISCIPLINES} cols={3} className="mt-[clamp(48px,6vw,80px)]" />
      </Wrap>
    </Section>
  );
}
