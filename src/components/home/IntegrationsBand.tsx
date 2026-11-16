import { MicrosoftTeamsLogo } from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";
import LogoLoop, { type LogoItem } from "@/components/reactbits/LogoLoop";
import { BRAND_PATHS, type BrandKey } from "@/components/home/brand-paths";

/* Two belts of the tools Mytheus works with, running in opposite directions (React Bits
   LogoLoop): what comes IN (the calls the Mytheus Capture extension brings in without a bot,
   and the calendar that schedules them) and where decisions go OUT (the workspace integrations,
   plus the apps where "decisions that follow you" speaks up). Only real integrations: the list
   mirrors src/lib/integrations.ts and extension/README.md. Marks sit in the house ink and take
   their own colour on hover; dark brand colours stay in ink so they never vanish in dark mode. */

function Mark({ k }: { k: BrandKey; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden className="flex-none" fill="currentColor">
      <path d={BRAND_PATHS[k]} />
    </svg>
  );
}

function item(name: string, icon: ReactNode, hoverColor?: string): LogoItem {
  return {
    node: (
      <span className="inline-flex items-center gap-[.42em] font-display text-[1em] tracking-[-0.02em] text-ink">
        <span className="text-[.86em]">{icon}</span>
        <span className="text-[.82em]">{name}</span>
      </span>
    ),
    title: name,
    ariaLabel: name,
    hoverColor,
  };
}

const IN: LogoItem[] = [
  item("Google Meet", <Mark k="googlemeet" label="Google Meet" />, "#00897b"),
  item("Microsoft Teams", <MicrosoftTeamsLogo weight="fill" size="1em" aria-hidden />, "#5059c9"),
  item("Zoom", <Mark k="zoom" label="Zoom" />, "#0b5cff"),
  item("Google Calendar", <Mark k="googlecalendar" label="Google Calendar" />, "#4285f4"),
  item("Chrome", <Mark k="googlechrome" label="Chrome" />, "#4285f4"),
];

const OUT: LogoItem[] = [
  item("Slack", <Mark k="slack" label="Slack" />),
  item("Jira", <Mark k="jira" label="Jira" />, "#0052cc"),
  item("Linear", <Mark k="linear" label="Linear" />, "#5e6ad2"),
  item("Notion", <Mark k="notion" label="Notion" />),
  item("Confluence", <Mark k="confluence" label="Confluence" />, "#1868db"),
  item("HubSpot", <Mark k="hubspot" label="HubSpot" />, "#ff7a59"),
  item("Gmail", <Mark k="gmail" label="Gmail" />, "#ea4335"),
  item("Google Docs", <Mark k="googledocs" label="Google Docs" />, "#4285f4"),
];

function Belt({ tag, caption, logos, direction }: { tag: string; caption: string; logos: LogoItem[]; direction: "left" | "right" }) {
  return (
    <div className="grid items-center gap-x-8 gap-y-3 border-t border-line py-[clamp(18px,2.4vw,28px)] md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="text-left">
        <p className="font-display text-[1.45rem] leading-none text-ink">{tag}</p>
        <p className="mt-1.5 text-[14px] text-ink-3">{caption}</p>
      </div>
      <LogoLoop
        logos={logos}
        direction={direction}
        speed={42}
        hoverSpeed={8}
        logoHeight={34}
        gap={64}
        fadeOut
        fadeOutWidth={0.1}
        scrollBoost={0.6}
        ariaLabel={`${tag}: ${logos.map((l) => l.title).join(", ")}`}
      />
    </div>
  );
}

export function IntegrationsBand() {
  return (
    <section id="works-with" data-snap="" data-snap-label="Works with" className="relative py-[clamp(56px,8vw,104px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center">
      <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <div data-snap-in="" className="mb-[clamp(20px,3vw,36px)] grid items-end gap-x-14 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <h2 className="display max-w-[20ch] text-[clamp(1.7rem,3vw,2.5rem)] leading-[1.05]">Meetings come in from anywhere. Decisions go where the work is.</h2>
          <p className="max-w-[44ch] text-[16px] leading-relaxed text-ink-3">
            Your Myte works with the tools your team already lives in. Hover a belt to slow it down; drag it to look around.
          </p>
        </div>
        <div data-snap-in="" style={{ ["--si" as string]: 2 }}>
          <Belt tag="Comes in" caption="Calls, no bot required" logos={IN} direction="left" />
          <Belt tag="Goes out" caption="Decisions, owners, next steps" logos={OUT} direction="right" />
          <div className="border-t border-line" />
        </div>
      </div>
    </section>
  );
}
