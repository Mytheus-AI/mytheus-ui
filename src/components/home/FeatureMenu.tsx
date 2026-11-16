import FlowingMenu, { type FlowingMenuItem } from "@/components/reactbits/FlowingMenu";
import { SectionHead } from "@/components/site/Section";
import { AGENT_SLUGS, FEATURES } from "@/lib/marketing/features";

/* What your Myte does, as an index you can run a finger down (React Bits FlowingMenu). Each row
   is a real link to its feature page; hovering floods the row with a coral band that streams the
   feature's own promise (its hero line from src/lib/marketing/features.ts), entering from the
   edge the pointer came in on. Keyboard focus does the same; touch taps straight through. */

const ITEMS: FlowingMenuItem[] = [
  ...FEATURES.filter((f) => AGENT_SLUGS.includes(f.slug)).map((f) => ({
    text: f.nav,
    link: `/features/${f.slug}`,
    marquee: `${f.title} ${f.accent}`,
  })),
  { text: "Every feature", link: "/features", marquee: "Search, transcripts, the knowledge graph and more", meta: `${FEATURES.length}` },
];

export function FeatureMenu() {
  return (
    <section id="features" data-snap="" data-snap-label="Features" className="py-[clamp(64px,9vw,120px)]">
      <div data-snap-in="" className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <SectionHead
          title="Everything your Myte does."
          lead="Run down the list. Each one is a page of its own, with what it does, what it never does, and how it looks in the room."
        />
      </div>
      <div data-snap-in="" style={{ ["--si" as string]: 2 }} className="border-y border-line-2">
        <div style={{ height: `calc(${ITEMS.length} * clamp(64px, 8.4vw, 108px))` }}>
          <FlowingMenu
            items={ITEMS}
            ariaLabel="Mytheus features"
            className="font-display"
            align="left"
            showIndex
            showArrow
            speed={70}
            direction="alternate"
            bgColor="transparent"
            textColor="var(--ink)"
            marqueeBgColor="var(--signal)"
            marqueeTextColor="var(--pill-on)"
            borderColor="var(--line-2)"
          />
        </div>
      </div>
    </section>
  );
}
