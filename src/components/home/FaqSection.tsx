import { Section, Wrap } from "@/components/site/Section";
import s from "@/components/home/home.module.css";

/* Questions: the title and a short lead on the left, a plain accordion on the right. Native
   details/summary, so it works without JS and from the keyboard; the coral plus turns into a
   minus when an answer is open. */

const QA = [
  {
    q: "Is there a bot that joins my call?",
    a: "No. Mytheus is its own meeting platform. The call happens in Mytheus, so there is no recording link to paste and no third-party notetaker in the participant list. Each person's agent listens from the inside.",
  },
  {
    q: "Does it integrate with Zoom, Meet or Teams?",
    a: "Not today. Meetings run inside Mytheus, which is how every participant gets an agent without a bot joining. You invite people with a link, like any other call.",
  },
  {
    q: "Will the agent commit decisions without me?",
    a: "No. Your agent proposes and you confirm. Nothing is saved, assigned or shared until you tap Confirm, and you can edit or dismiss anything first.",
  },
  {
    q: "How do agents collaborate across meetings?",
    a: "When your agent needs context, it asks another participant's agent. The answer comes back with its source, the exact meeting it came from, so you can check it yourself.",
  },
  {
    q: "Who can see my notes and the shared memory?",
    a: "Your own notes stay yours. Confirmed decisions and action items go into the memory shared with the people who were in that meeting.",
  },
  {
    q: "Is it free to start?",
    a: "Yes. Getting started is free, and no bot joins your call on any plan.",
  },
];

export function FaqSection() {
  return (
    <Section id="questions">
      <Wrap className="grid items-start gap-x-16 gap-y-7 min-[821px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div>
          <h2 className="display max-w-[17ch] text-[clamp(2.1rem,4.6vw,3.5rem)]">Questions, before you ask them.</h2>
          <p className="mt-4 max-w-[52ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
            What teams ask first: the bot, your privacy, and where your meetings live.
          </p>
        </div>
        <div className="border-t border-line-2">
          {QA.map((item, i) => (
            <details key={item.q} open={i === 0} className={`${s.faqItem} border-b border-line-2`}>
              <summary className="cursor-pointer py-5 pr-11 font-display text-[1.4rem] font-medium leading-[1.2] tracking-[-0.012em] text-ink transition-colors hover:text-signal-ink">
                {item.q}
              </summary>
              <p className="max-w-[62ch] pb-[22px] pr-11 leading-relaxed text-ink-3">{item.a}</p>
            </details>
          ))}
        </div>
      </Wrap>
    </Section>
  );
}
