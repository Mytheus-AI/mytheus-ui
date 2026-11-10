import Image from "next/image";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Stage } from "@/components/site/Section";

/* The about page opener: the centred hero with the loop on the promise, then the story told in
   the serif beside the one photo of the four of us, on a peach stage. */
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
        <div className="grid items-center gap-[clamp(24px,4vw,56px)] md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
          <figure>
            <div className="overflow-hidden rounded-card bg-bg-2 shadow-warm-3">
              <Image
                src="/team/cybersprinters.jpg"
                alt="The four CyberSprinters together at the beach"
                width={640}
                height={640}
                sizes="(min-width: 768px) 440px, 92vw"
                className="h-auto w-full object-cover"
                priority
              />
            </div>
            <figcaption className="mt-3 font-display text-[1.05rem] italic text-ink-3">The whole crew, one frame.</figcaption>
          </figure>
          <div className="space-y-5 font-display text-[clamp(1.35rem,2.4vw,1.85rem)] leading-[1.3] tracking-[-0.012em] text-ink">
            <p>We build agentic AI: software that listens, decides, and remembers.</p>
            <p>Four builders and one flagship, built in sprints and remembered forever.</p>
            <p className="text-ink-2">
              Mytheus is that promise shipped: <em>every meeting, carried forward.</em>
            </p>
          </div>
        </div>
      </Stage>
    </PageHero>
  );
}
