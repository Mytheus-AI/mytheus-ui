import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Stage } from "@/components/site/Section";

/* The about page opener: the centred hero with the loop on the promise, then the story told in
   the serif, centred on a peach stage. */
export function AboutHero() {
  return (
    <PageHero
      eyebrow="CyberSprinters"
      title={
        <>
          Four minds. <Loop>One sprint.</Loop>
        </>
      }
      blurb="Meet CyberSprinters: Sushan Shetty, Samar Rihan, Shaun Marvell Rodrigues and Yash V Maurya, the four builders of agentic software behind Mytheus."
      secondaryHref="#crew"
      secondaryLabel="Meet the four"
    >
      <Stage glow>
        <div className="mx-auto max-w-[34ch] space-y-5 py-[clamp(8px,2vw,24px)] text-center font-display text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.3] tracking-[-0.012em] text-ink">
          <p>We build agentic AI: software that listens, decides, and remembers.</p>
          <p>Four builders and one flagship, built in sprints and remembered forever.</p>
          <p className="text-ink-2">
            Mytheus is that promise shipped: <em>every meeting, carried forward.</em>
          </p>
        </div>
      </Stage>
    </PageHero>
  );
}
