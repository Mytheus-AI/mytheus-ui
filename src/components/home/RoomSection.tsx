import { Chip, Live, Section, SectionHead, Stage, Win, WinBar, Wrap } from "@/components/site/Section";
import { Av, type Tone } from "@/components/home/Tangle";
import { ConfirmDecision } from "@/components/home/ConfirmDecision";

/* In the room: the live transcript on the left, what the agent captured from it on the right.
   Raj is out, so his agent speaks for him (drawn with the tangle, not a face). */

const TALK: { tone: Tone; initial?: string; agent?: boolean; name: string; note?: string; line: string }[] = [
  { tone: "peach", initial: "M", name: "Maya", line: "Let's lock the Q3 launch. I'm proposing August 12." },
  {
    tone: "accent",
    agent: true,
    name: "Raj's agent",
    note: "(Raj is out today)",
    line: "QA needs two extra days after code freeze.",
  },
  { tone: "sage", initial: "P", name: "Priya", line: "Then the 12th is too tight. QA would still be running." },
];

export function RoomSection() {
  return (
    <Section id="room" cross>
      <Wrap>
        <SectionHead
          title="Decisions get caught as they're said."
          lead="While people talk, your agent files each moment as a decision, a piece of context or a conflict. Nothing is saved until you confirm it."
        />
        <Stage tone="ochre">
          <Win>
            <WinBar title="Q3 launch sync" meta={<Live />} right={<Chip>3 captured</Chip>} />
            <div className="grid min-[821px]:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
              <div className="border-b border-line px-[22px] py-6 min-[821px]:border-b-0 min-[821px]:border-r">
                <h3 className="mb-3.5 text-[14.5px] font-semibold text-ink-3">Transcript</h3>
                <ul>
                  {TALK.map((t) => (
                    <li key={t.name} className="grid grid-cols-[30px_1fr] gap-x-3 gap-y-0.5 py-[0.6em]">
                      <Av tone={t.tone} agent={t.agent}>
                        {t.initial}
                      </Av>
                      <b className="self-center text-[14.5px] font-semibold text-ink">
                        {t.name}
                        {t.note ? <span className="font-medium text-ink-3"> {t.note}</span> : null}
                      </b>
                      <p className="col-start-2 text-[1.06rem] leading-[1.4] text-ink-2">{t.line}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-surface-2 px-[22px] py-6">
                <h3 className="mb-3.5 text-[14.5px] font-semibold text-ink-3">Captured</h3>
                <ul className="space-y-2.5">
                  <ConfirmDecision />
                  <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
                    <Chip tone="low">Context</Chip>
                    <p className="mt-1.5 font-medium leading-[1.35] text-ink">
                      From Raj&apos;s agent: QA needs 2 more days after the freeze.
                    </p>
                  </li>
                  <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
                    <Chip tone="high">Conflict</Chip>
                    <p className="mt-1.5 font-medium leading-[1.35] text-ink">August 12 collides with the QA window.</p>
                  </li>
                </ul>
              </div>
            </div>
          </Win>
        </Stage>
      </Wrap>
    </Section>
  );
}
