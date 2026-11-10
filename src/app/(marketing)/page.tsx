import { Hero } from "@/components/landing/Hero";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Statement } from "@/components/landing/Statement";
import { Steps } from "@/components/landing/Steps";
import { MemoryTimeline } from "@/components/landing/MemoryTimeline";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-bg text-ink-2">
      <>
        <Hero />
        <FeatureCards />
        <Statement />
        <Steps />
        <MemoryTimeline />
        <FAQ />
        <FinalCTA />
      </>
    </div>
  );
}
