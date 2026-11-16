import Link from "next/link";
import { AGENT_SLUGS as AGENT, FEATURES } from "@/lib/marketing/features";
import { MARK_PATH } from "@/components/Logo";
import { InView } from "@/components/site/InView";
import { WAVE } from "@/components/site/footer-wave";
import s from "@/components/site/footer.module.css";

/* The marketing footer: the end of the line. One screen tall on desktop (the home page's last
   snap lands on it whole), a dark panel that slides up over the last section, in three bands:

   1. the promise set large with the one action beside it, the links on the right, and the
      copyright and legal links folded into the same block (no separate base bar);
   (between them, on desktop, a thin coral voice line drifts across the panel: a meeting being
   heard, bursts of talk and quiet between;)
   2. the brand mark drawn huge in coral as the footer arrives, the tangle resolving into the
      rising line, which runs on into
   3. the wordmark set across the whole width and cut by the panel's bottom edge, with a low coral
      glow behind it. Each letter lifts a little under the pointer.

   The page-long line (Thread) on other pages ends in the tail of the mark (`[data-thread-end]`);
   the mark also draws itself when the footer scrolls into view (InView adds `.in`). The panel is
   the dark control colour, so it turns cream in the dark theme like every other dark control.
   Reduced motion shows the mark drawn and the letters still. */

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "All features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Security", href: "/security" },
      { label: "For students", href: "/students" },
    ],
  },
  {
    title: "Your Myte",
    links: FEATURES.filter((f) => AGENT.includes(f.slug)).map((f) => ({ label: f.nav, href: `/features/${f.slug}` })),
  },
  {
    title: "Platform",
    links: FEATURES.filter((f) => !AGENT.includes(f.slug)).map((f) => ({ label: f.nav, href: `/features/${f.slug}` })),
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "GitHub", href: "https://github.com/Mytheus-AI" },
    ],
  },
];

const soft = "text-[color-mix(in_srgb,var(--pill-on)_58%,transparent)]";
const WORD = "Mytheus".split("");

export function SiteFooter() {
  return (
    <footer
      data-snap-end=""
      className={`${s.footer} relative z-10 -mt-7 flex flex-col overflow-hidden rounded-t-hero bg-pill text-pill-on lg:h-[min(100svh,1000px)] lg:min-h-[640px]`}
    >
      <div aria-hidden className={s.glow} />

      {/* band 1: the promise, the action, the links */}
      <div className="relative mx-auto grid w-[min(1280px,100%-40px)] gap-x-[clamp(32px,5vw,80px)] gap-y-12 pt-[clamp(56px,8vh,104px)] sm:w-[min(1280px,100%-80px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div>
          <p className={`text-[14px] font-semibold ${soft}`}>The end of the line, for now.</p>
          <p className="display mt-3 !text-pill-on text-[clamp(2.5rem,4.6vw,4.2rem)] leading-[0.96]">
            Every meeting,
            <br />
            <span className="text-signal-line">on repeat.</span>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-ctl bg-pill-on px-5 text-[15.5px] font-semibold text-pill transition-[opacity,transform] hover:opacity-90 motion-safe:active:scale-[.98]"
            >
              Get started free
            </Link>
            <a href="mailto:hello@mytheus.cloud" className="font-semibold underline decoration-signal-line decoration-2 underline-offset-[6px] transition-colors hover:text-signal-line">
              hello@mytheus.cloud
            </a>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4">
            {COLS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h3 className={`mb-3.5 text-[13.5px] font-semibold ${soft}`}>{c.title}</h3>
                <ul className="space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[15px] font-medium text-[color-mix(in_srgb,var(--pill-on)_86%,transparent)] decoration-signal-line decoration-2 underline-offset-[5px] transition-colors hover:text-pill-on hover:underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <p className={`mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] ${soft}`}>
            <span>&copy; 2026 Mytheus</span>
            <Link href="/privacy" className="transition-colors hover:text-pill-on">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-pill-on">
              Terms
            </Link>
            <Link href="/security" className="transition-colors hover:text-pill-on">
              Security
            </Link>
          </p>
        </div>
      </div>

      {/* the voice line: a meeting being heard, drifting across the panel */}
      <div aria-hidden className={`${s.voice} relative hidden flex-1 items-center lg:flex`}>
        <svg viewBox="0 0 2400 120" preserveAspectRatio="none" className={`${s.wave} h-[clamp(70px,11vh,120px)] w-[200%] flex-none`}>
          <path d={WAVE} fill="none" stroke="var(--signal-line)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* bands 2 and 3: the mark draws, and runs on into the wordmark */}
      <InView threshold={0.2} className="relative mt-auto pt-[clamp(28px,4vh,56px)] lg:mt-0">
        <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
          <Link href="/" aria-label="Mytheus home" className={`${s.sign} group flex items-end gap-[1.4vw] rounded-ctl`}>
            <svg
              viewBox="0 0 802 414"
              aria-hidden
              data-thread-end=""
              data-thread-x={775 / 802}
              data-thread-y={38 / 414}
              className={`${s.mark} h-auto w-[21%] flex-none overflow-visible`}
            >
              <path d={MARK_PATH} pathLength={1} fill="none" stroke="var(--signal-line)" strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`${s.word} wordmark whitespace-nowrap text-pill-on`} aria-hidden>
              {WORD.map((ch, i) => (
                <span key={i} className={s.letter} style={{ ["--i" as string]: i }}>
                  {ch}
                </span>
              ))}
            </span>
          </Link>
        </div>
      </InView>
    </footer>
  );
}
