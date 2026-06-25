import { ScrollProgressBar } from "@/components/landing/motion";
import { Loader } from "@/components/landing/Loader";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { ScrollStory } from "@/components/landing/ScrollStory";
import { MemoryBlock, BusyDaysBlock } from "@/components/landing/ColorBlocks";
import { WorksEverywhere } from "@/components/landing/WorksEverywhere";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-paper text-ink">
      <Loader />
      <ScrollProgressBar />
      <SiteHeader />
      <main>
        <Hero />
        <ScrollStory />
        <MemoryBlock />
        <BusyDaysBlock />
        <WorksEverywhere />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
