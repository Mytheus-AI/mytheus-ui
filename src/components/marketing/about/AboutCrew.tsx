import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Section, SectionHead, Wrap } from "@/components/site/Section";

/* The crew: four people on one aligned row, each opening on a hairline. No floating chips, no
   tilt, no hover physics; the names and what each of us is like to work with. */

const MEMBERS: { name: string; line: string }[] = [
  {
    name: "Sushan Shetty",
    line: "Takes an idea from whiteboard to working agent without dropping the thread.",
  },
  {
    name: "Samar Rihan",
    line: "Builds the whole surface: the logic, the pixels, and everything between.",
  },
  {
    name: "Shaun Marvell Rodrigues",
    line: "Happiest when a half-formed prompt turns into a product you can actually ship.",
  },
  {
    name: "Yash V Maurya",
    line: "End to end by default: design it, wire it, ship it, then obsess over it.",
  },
];

export function AboutCrew() {
  return (
    <Section cross id="crew">
      <Wrap>
        <SectionHead
          title="Four builders, one wavelength."
          lead="CyberSprinters is the four of us, designing, wiring, and shipping agentic products end to end. Same beach, same backlog."
        />
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {MEMBERS.map((m) => (
            <li key={m.name} className="border-t border-line-2 pt-6">
              <Avatar name={m.name} size="lg" />
              <h3 className="mt-4 font-display text-[1.45rem] font-medium leading-tight tracking-[-0.015em] text-ink">{m.name}</h3>
              <p className="kicker mt-1.5">CyberSprinter</p>
              <p className="mt-3 max-w-[36ch] text-[15.5px] leading-relaxed text-ink-3">{m.line}</p>
            </li>
          ))}
        </ul>
        <p className="mt-12 font-display text-[1.2rem]  text-ink-3">
          One thread, four hands on it.{" "}
          <Link
            href="/careers"
            className="font-sans text-[16px] font-semibold not-italic text-ink underline decoration-signal-line decoration-2 underline-offset-[6px] hover:decoration-signal"
          >
            There&apos;s room on the line
          </Link>
        </p>
      </Wrap>
    </Section>
  );
}
