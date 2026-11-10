import { Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { NotesWindow } from "@/components/home/NotesWindow";

export function NotesSection() {
  return (
    <Section id="notes" cross>
      <Wrap>
        <SectionHead
          title="Your shorthand, returned as minutes."
          lead="Jot whatever you catch on the call. Your agent turns the mess into clean notes you can share, with headings, owners and next steps."
        />
        <Stage>
          <NotesWindow />
        </Stage>
      </Wrap>
    </Section>
  );
}
