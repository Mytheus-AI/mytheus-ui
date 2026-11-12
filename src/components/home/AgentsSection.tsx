import { Section, SectionHead, Wrap } from "@/components/site/Section";
import { AgentRelay } from "@/components/home/AgentRelay";

export function AgentsSection() {
  return (
    <Section id="agents" cross>
      <Wrap>
        <SectionHead
          title="Your Mytes keep talking after the call."
          lead="When yours needs context, it asks another person's Myte. The answer comes back with its source: the exact meeting where it was said."
        />
        <AgentRelay />
      </Wrap>
    </Section>
  );
}
