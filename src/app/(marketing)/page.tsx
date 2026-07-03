import { ScrollProgressBar } from "@/components/landing/motion";
import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Loader } from "@/components/landing/Loader";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { Hero } from "@/components/landing/Hero";
import { FeatureCards } from "@/components/landing/FeatureCards";
import { Statement } from "@/components/landing/Statement";
import { Steps } from "@/components/landing/Steps";
import { MemoryTimeline } from "@/components/landing/MemoryTimeline";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { SiteFooter } from "@/components/landing/SiteFooter";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-bg text-ink-2">
      <SmoothScroll />
      <Loader />
      <ScrollProgressBar />
      <SiteHeader />
      <main>
        <Hero />
        <FeatureCards />
        <Statement />
        <Steps />
        <MemoryTimeline />
        <FAQ />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
}
