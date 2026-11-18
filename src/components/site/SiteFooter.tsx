import Link from "next/link";
import {
  ArrowRight,
  ArrowUp,
  GithubLogo,
} from "@phosphor-icons/react/dist/ssr";
import { AGENT_SLUGS as AGENT, FEATURES } from "@/lib/marketing/features";
import { MARK_PATH } from "@/components/Logo";
import { InView } from "@/components/site/InView";
import s from "@/components/site/footer.module.css";

/* The marketing footer: a calm dark panel that slides up over the last section, rounded at the
   top. No giant type; everything is set at reading size.

   1. The brand block: the mark (where the page-long coral line ends: `[data-thread-end]`, and it
      draws itself when the footer arrives), the wordmark, the promise in one serif line, a short
      line of what Mytheus is, and the one action.
   2. Four link columns.
   3. A hairline, then the legal row: copyright, the policies, GitHub, the address, back to top.

   The panel is ink in the light theme and a deeper shade of the page in the dark theme (the
   footer reads its own --f-bg / --f-ink, footer.module.css), so it never flips to cream.
   It is the home page's last snap stop (`data-snap-end`: the page's bottom), and the home page's
   contour map shows above it there. Reduced motion shows the mark drawn. */

const COLS: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
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
    links: FEATURES.filter((f) => AGENT.includes(f.slug)).map((f) => ({
      label: f.nav,
      href: `/features/${f.slug}`,
    })),
  },
  {
    title: "Platform",
    links: FEATURES.filter((f) => !AGENT.includes(f.slug)).map((f) => ({
      label: f.nav,
      href: `/features/${f.slug}`,
    })),
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      {
        label: "GitHub",
        href: "https://github.com/Mytheus-AI",
        external: true,
      },
    ],
  },
];

const wrap = "mx-auto w-[min(1200px,100%-40px)] sm:w-[min(1200px,100%-80px)]";

export function SiteFooter() {
  return (
    <footer
      data-snap-end=""
      className={`${s.footer} relative z-10 -mt-7 overflow-hidden rounded-t-hero`}
    >
      <div aria-hidden className={s.glow} />

      <div
        className={`${wrap} grid gap-x-[clamp(32px,6vw,96px)] gap-y-14 pb-14 pt-[clamp(56px,7vw,88px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]`}
      >
        {/* 1. the brand block */}
        <InView threshold={0.3} className="max-w-[420px]">
          <Link
            href="/"
            aria-label="Mytheus home"
            className="group inline-flex items-center gap-3 rounded-ctl"
          >
            <svg
              viewBox="0 0 802 414"
              aria-hidden
              data-thread-end=""
              data-thread-x={775 / 802}
              data-thread-y={38 / 414}
              className={`${s.mark} h-[30px] w-auto flex-none overflow-visible`}
            >
              <path
                d={MARK_PATH}
                pathLength={1}
                fill="none"
                stroke="var(--signal-line)"
                strokeWidth={34}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className={`wordmark text-[25px] leading-none ${s.ink}`}>
              Mytheus
            </span>
          </Link>

          <p
            className={`display mt-7 text-[clamp(1.6rem,2.4vw,2rem)] leading-[1.1] ${s.ink}`}
          >
            Every meeting, <span className="text-signal-line">on repeat.</span>
          </p>
          <p className={`mt-3 text-[15.5px] leading-relaxed ${s.soft}`}>
            The meeting platform that remembers. Your Myte keeps what was said,
            decided and promised, and brings it back when it matters.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/sign-up"
              className={`${s.cta} group/cta inline-flex h-11 items-center gap-1.5 rounded-ctl px-4 text-[15px] font-semibold motion-safe:active:scale-[.98]`}
            >
              Get started free
              <ArrowRight
                size={14}
                weight="bold"
                aria-hidden
                className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
              />
            </Link>
            <Link
              href="/enterprise"
              className={`${s.link} text-[15px] font-semibold`}
            >
              Talk to the team
            </Link>
          </div>
        </InView>

        {/* 2. the links */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:pt-1.5">
          {COLS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h3 className={`mb-4 text-[13px] font-semibold ${s.faint}`}>
                {c.title}
              </h3>
              <ul className="space-y-3">
                {c.links.map((l) => (
                  <li key={l.href}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`${s.link} text-[14.5px]`}
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className={`${s.link} text-[14.5px]`}>
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      {/* 3. the legal row */}
      <div
        className={`${wrap} ${s.rule} flex flex-col gap-4 py-6 text-[13.5px] sm:flex-row sm:items-center sm:justify-between`}
      >
        <p className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${s.faint}`}>
          <span>&copy; 2026 Mytheus</span>
          <Link href="/privacy" className={s.link}>
            Privacy
          </Link>
          <Link href="/terms" className={s.link}>
            Terms
          </Link>
          <Link href="/security" className={s.link}>
            Security
          </Link>
        </p>
        <div
          className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${s.faint}`}
        >
          <a href="mailto:hello@mytheus.cloud" className={s.link}>
            hello@mytheus.cloud
          </a>
          <a
            href="https://github.com/Mytheus-AI"
            target="_blank"
            rel="noreferrer"
            aria-label="Mytheus on GitHub"
            className={`${s.link} ${s.icon} grid h-9 w-9 place-items-center rounded-ctl`}
          >
            <GithubLogo size={18} aria-hidden />
          </a>
          <a
            href="#top"
            className={`${s.link} ${s.icon} inline-flex h-9 items-center gap-1.5 rounded-ctl px-2.5`}
          >
            Back to top
            <ArrowUp size={13} weight="bold" aria-hidden />
          </a>
        </div>
      </div>
    </footer>
  );
}
