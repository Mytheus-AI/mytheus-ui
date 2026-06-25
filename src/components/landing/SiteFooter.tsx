import Link from "next/link";
import { Reveal } from "./motion";

/* ------------------------------------------------------------------ */
/*  Footer — real social link(s) + link columns + copyright, capped by   */
/*  a giant Reprise wordmark spanning the very bottom of the page.       */
/*  No dead "#" links: only routes/anchors that actually go somewhere.   */
/* ------------------------------------------------------------------ */

const columns: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "#how" },
      { label: "Features", href: "#features" },
      { label: "Enterprise", href: "/enterprise" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
      { label: "GitHub", href: "https://github.com/Reprise-AI" },
    ],
  },
  {
    heading: "Students",
    links: [
      { label: "Student Program", href: "/students" },
      { label: "Get verified", href: "/students/verify" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="overflow-hidden border-t border-line bg-paper-2">
      <div className="mx-auto max-w-[80rem] px-4 pb-8 pt-12 sm:px-6 sm:pt-16">
        <Reveal className="flex flex-col gap-10 lg:flex-row lg:justify-between lg:gap-12">
          {/* real social — Reprise AI on GitHub (no dead links) */}
          <div className="flex flex-col items-start gap-4">
            <a
              href="https://github.com/Reprise-AI"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Reprise AI on GitHub"
              className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition-colors hover:border-signal hover:text-signal"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.4 9.4 0 0 1 12 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.06 10.06 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
              </svg>
            </a>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink-soft/60">
              Designed &amp; built with care
            </p>
          </div>

          {/* link columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4 sm:gap-10 lg:gap-16">
            {columns.map((col) => (
              <div key={col.heading}>
                <h3 className="kicker text-ink-soft">{col.heading}</h3>
                <ul className="mt-4 space-y-1 sm:mt-5 sm:space-y-3">
                  {col.links.map((link) => {
                    const external = link.href.startsWith("http");
                    return (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          {...(external
                            ? { target: "_blank", rel: "noopener noreferrer" }
                            : {})}
                          className="link-underline inline-flex min-h-[40px] items-center text-sm text-ink transition-colors hover:text-signal"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* copyright */}
          <p className="font-mono text-xs text-ink-soft/70 lg:text-right">
            © {new Date().getFullYear()} Reprise AI
            <br className="hidden lg:block" /> Every meeting, on repeat.
          </p>
        </Reveal>

        {/* giant wordmark spanning the bottom */}
        <Link
          href="/"
          aria-label="Reprise — home"
          className="mt-12 block overflow-hidden sm:mt-16"
        >
          <span className="block select-none whitespace-nowrap font-logo text-[clamp(3.25rem,20vw,18rem)] leading-[0.95] tracking-tight text-ink/[0.08] transition-colors hover:text-ink/[0.12]">
            Reprise<span className="text-signal/30">.</span>
          </span>
        </Link>
      </div>
    </footer>
  );
}
