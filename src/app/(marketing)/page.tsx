import { HomeHero } from "@/components/home/HomeHero";
import { IntegrationsBand } from "@/components/home/IntegrationsBand";
import { SignalSection } from "@/components/home/SignalSection";
import { MyteSection } from "@/components/home/MyteSection";
import { RelaySection } from "@/components/home/RelaySection";
import { ConfirmSection } from "@/components/home/ConfirmSection";
import { FeatureMenu } from "@/components/home/FeatureMenu";
import { HowSection } from "@/components/home/HowSection";
import { HomeClose } from "@/components/home/HomeClose";
import { SnapStage } from "@/components/home/fx/SnapStage";

/* The home page: signal out of noise.
   1. Hero: an eclipse of transcript glyphs (React Bits GradientASCII), the promise resolving out of
      it, a live ticker of a meeting being labelled.
   2. Works with: two belts of real integrations running opposite ways (LogoLoop).
   3. Signal: a pinned transcript where your Myte lights the four lines that matter.
   4. Meet your Myte: a Myte's portrait printed as a coral dither that clears under the pointer
      (DitherVeil).
   5. Relay: the Myte-to-Myte exchange, typed out, cited.
   6. Confirm: the proposal card you can actually confirm, carried down the week.
   7. How it works: five steps drawn as one coral line, talk to follow-through (from the previous
      home page).
   8. Features: an index that floods coral on hover with what each feature does and a picture of
      it (FlowingMenu), then the close on a moving contour map (Topography), over the footer's cubes.
   The page snaps section by section, with a rail of sections on the right (SnapStage).
   Nav and footer come from the marketing layout. The page-long coral line is off on this page. */
export default function Home() {
  return (
    <>
      {/* Marker: switches the display font to Newsreader on this page only (globals.css). */}
      <span hidden data-home-type />
      <HomeHero />
      <IntegrationsBand />
      <SignalSection />
      <MyteSection />
      <RelaySection />
      <ConfirmSection />
      <HowSection />
      <FeatureMenu />
      <HomeClose />
      <SnapStage />
    </>
  );
}
