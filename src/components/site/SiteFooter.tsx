import Link from "next/link";
import { AGENT_SLUGS as AGENT, FEATURES } from "@/lib/marketing/features";
import { MARK_PATH } from "@/components/Logo";

/* The marketing footer: a rounded, slightly sunk panel. The page-long line (Thread) ends in the
   tail of the large mark, which then draws itself (`[data-thread-end]` gets `.in`). Columns are
   plain links; the base row holds the legal links and a way back to the top. */

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
      { label: "LinkedIn", href: "https://www.linkedin.com/company/reprise-ai" },
      { label: "X", href: "https://x.com/RepriseAI" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-4 rounded-t-hero bg-bg-2 pt-[clamp(96px,10vw,128px)]">
      <div className="site-wrap mx-auto grid w-[min(1120px,100%-40px)] grid-cols-2 gap-x-8 gap-y-10 pb-[clamp(48px,6vw,84px)] sm:w-[min(1120px,100%-80px)] lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,.62fr))]">
        <div className="col-span-2 lg:col-span-1">
          <Link href="/" aria-label="Mytheus home" className="inline-flex items-center gap-[clamp(12px,1.6vw,20px)] rounded-ctl">
            <svg
              viewBox="0 0 802 414"
              aria-hidden
              data-thread-end=""
              data-thread-x={775 / 802}
              data-thread-y={38 / 414}
              className="foot-mark h-auto w-[clamp(96px,11vw,148px)] flex-none overflow-visible"
            >
              <path
                d={MARK_PATH}
                pathLength={1}
                fill="none"
                stroke="var(--signal-line)"
                strokeWidth={30}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="wordmark text-[clamp(2.3rem,4.6vw,3.6rem)] leading-none text-ink">Mytheus</span>
          </Link>
          <p className="mt-5 max-w-[28ch] font-display text-[1.3rem] italic leading-snug text-ink-3">
            One line through every meeting your team has. You just followed it here.
          </p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h3 className="mb-3 text-[14px] font-semibold text-ink-3">{c.title}</h3>
            <ul className="space-y-2.5">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[15.5px] font-medium text-ink decoration-signal-line decoration-2 underline-offset-[5px] hover:underline"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="mx-auto flex w-[min(1120px,100%-40px)] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line-2 pb-6 pt-[18px] text-[14.5px] text-ink-3 sm:w-[min(1120px,100%-80px)]">
        <span>&copy; 2026 Mytheus</span>
        <nav aria-label="Legal" className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <a
            href="#top"
            className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface-2 px-4 py-2 font-semibold text-ink hover:bg-surface"
          >
            <span aria-hidden>&uarr;</span>Back to the top
          </a>
        </nav>
      </div>
    </footer>
  );
}
