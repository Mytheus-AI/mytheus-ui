import { Section, SectionHead, Wrap } from "@/components/site/Section";
import { Flow } from "@/components/company/Flow";

/* How we sprint: the four lines the crew works by, set large in the serif, then the sprint
   itself as one coral thread through plan, build, ship and repeat, running on to the edge
   because the next sprint is already coming. */

const MANIFESTO: { lead: string; key: string }[] = [
  { lead: "Ship in", key: "sprints." },
  { lead: "Let Mytes do the", key: "remembering." },
  { lead: "Motion is a", key: "feature." },
  { lead: "Small team,", key: "whole product." },
];

export function AboutManifesto() {
  return (
    <Section cross id="how-we-sprint">
      <Wrap>
        <SectionHead title="How we sprint." lead="Four builders, six agents, one flagship. Every sprint ships; every meeting is remembered." />
        <ol className="grid border-b border-line-2 md:grid-cols-2 md:gap-x-12">
          {MANIFESTO.map((m) => (
            <li
              key={m.key}
              className="display border-t border-line-2 py-6 text-[clamp(1.9rem,4vw,3rem)] leading-[1.08]"
            >
              {m.lead} <em className="text-signal-ink">{m.key}</em>
            </li>
          ))}
        </ol>

        <p className="kicker mt-[clamp(48px,6vw,80px)]">The sprint loop</p>
        <Flow
          className="mt-6"
          steps={[
            { title: "Plan", body: "Scope tight. Decide what this sprint is for." },
            { title: "Build", body: "Small crew, short loops, the whole stack." },
            { title: "Ship", body: "Every sprint ships to real people." },
            { title: "Repeat", body: "Learn from it, then go again. Momentum is the methodology." },
          ]}
        />
      </Wrap>
    </Section>
  );
}
