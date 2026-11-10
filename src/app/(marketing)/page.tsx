import { CloseCTA } from "@/components/site/CloseCTA";
import { HomeHero } from "@/components/home/HomeHero";
import { NotesSection } from "@/components/home/NotesSection";
import { RoomSection } from "@/components/home/RoomSection";
import { AgentsSection } from "@/components/home/AgentsSection";
import { HowSection } from "@/components/home/HowSection";
import { WeekSection } from "@/components/home/WeekSection";
import { FaqSection } from "@/components/home/FaqSection";

/* The home page. Nav, the page-long line and the footer come from the marketing layout; the
   line starts at the hero loop and crosses the page above each `cross` section. */
export default function Home() {
  return (
    <>
      <HomeHero />
      <NotesSection />
      <RoomSection />
      <AgentsSection />
      <HowSection />
      <WeekSection />
      <FaqSection />
      <CloseCTA />
    </>
  );
}
