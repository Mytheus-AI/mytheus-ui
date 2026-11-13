"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FEATURES } from "@/lib/marketing/features";
import { Wordmark } from "@/components/site/Wordmark";
import { ThemeToggle } from "@/components/app/ThemeToggle";

/* The marketing nav: a floating frosted pill. A small coral squiggle sits under the page you are
   on and glides to the link you hover. Features opens a panel of every feature page. Below 860px
   the links fold into a sheet behind a round menu button. */

const LINKS = [
  { href: "/features", label: "Features", menu: true },
  { href: "/pricing", label: "Pricing" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
] as const;

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const [ind, setInd] = useState<{ x: number; on: boolean }>({ x: 0, on: false });
  const menuWrap = useRef<HTMLDivElement>(null);

  const current = LINKS.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.href ?? null;
  const target = hover ?? current;

  useIso(() => {
    const box = linksRef.current;
    if (!box) return;
    const a = target ? box.querySelector<HTMLElement>(`[data-href="${target}"]`) : null;
    if (!a) return setInd((v) => ({ ...v, on: false }));
    setInd({ x: a.offsetLeft + a.offsetWidth / 2 - 15, on: true });
  }, [target]);

  useEffect(() => {
    setSheet(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setSheet(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      if (menu && !menuWrap.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [menu, sheet]);

  return (
    <header data-site-nav="" className="sticky top-3.5 z-50 mx-auto mt-3.5 w-[min(1120px,100%-40px)] sm:w-[min(1120px,100%-80px)]">
      <div className="mx-auto flex max-w-[960px] items-center gap-1.5 rounded-full border border-line bg-surface-2 py-[7px] pl-[18px] pr-[7px] shadow-warm-2">
        <Link href="/" aria-label="Mytheus home" className="group mr-auto rounded-full">
          <Wordmark size={22} textClassName="text-[22px]" />
        </Link>

        <div
          ref={linksRef}
          className="relative hidden items-center min-[860px]:flex"
          onMouseLeave={() => setHover(null)}
        >
          {LINKS.map((l) =>
            "menu" in l ? (
              <div key={l.href} ref={menuWrap} className="relative">
                <button
                  type="button"
                  data-href={l.href}
                  aria-expanded={menu}
                  aria-controls="features-menu"
                  onMouseEnter={() => setHover(l.href)}
                  onClick={() => setMenu((m) => !m)}
                  className={`rounded-full px-[13px] py-2 text-[15.5px] font-medium transition-colors ${
                    current === l.href || menu ? "text-ink" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {l.label}
                </button>
                {menu && (
                  <div
                    id="features-menu"
                    className="absolute left-1/2 top-[calc(100%+14px)] w-[min(560px,90vw)] -translate-x-1/2 rounded-card border border-line bg-surface p-2.5 shadow-warm-3"
                  >
                    <ul className="grid grid-cols-2 gap-0.5">
                      {FEATURES.map((f) => (
                        <li key={f.slug}>
                          <Link
                            href={`/features/${f.slug}`}
                            className={`block rounded-ctl px-3 py-2.5 transition-colors hover:bg-bg ${
                              pathname === `/features/${f.slug}` ? "bg-bg" : ""
                            }`}
                          >
                            <span className="block text-[15px] font-semibold text-ink">{f.nav}</span>
                            <span className="mt-0.5 line-clamp-1 block text-[13px] text-ink-3">{f.blurb}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/features"
                      className="mt-1.5 flex items-center justify-between rounded-ctl bg-bg px-3 py-2.5 text-[14px] font-semibold text-ink hover:bg-bg-2"
                    >
                      See every feature in one place
                      <span aria-hidden className="text-signal">&rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                data-href={l.href}
                aria-current={current === l.href ? "page" : undefined}
                onMouseEnter={() => setHover(l.href)}
                className={`rounded-full px-[13px] py-2 text-[15.5px] font-medium transition-colors ${
                  current === l.href ? "text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ),
          )}
          <svg
            viewBox="0 0 30 7"
            aria-hidden
            className="pointer-events-none absolute bottom-0.5 left-0 h-[7px] w-[30px] transition-[transform,opacity] duration-[450ms] ease-[cubic-bezier(.215,.61,.355,1)]"
            style={{ transform: `translateX(${ind.x}px)`, opacity: ind.on ? 1 : 0 }}
          >
            <path d="M2 4.5 Q5.5 0 9 3.5 T16 3.5 T23 3.5 T28 2.5" fill="none" stroke="var(--signal-line)" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>

        <span className="[&>button]:rounded-full">
          <ThemeToggle />
        </span>
        <Link
          href="/sign-in"
          className="hidden px-3 py-2 text-[15.5px] font-semibold text-ink transition-colors hover:text-signal-ink min-[860px]:inline-block"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="inline-flex h-10 items-center whitespace-nowrap rounded-full bg-pill px-4 text-[15px] font-semibold text-pill-on transition-[background-color,box-shadow] hover:bg-pill-2 hover:shadow-warm-2"
        >
          Get started<span className="hidden min-[480px]:inline">&nbsp;free</span>
        </Link>
        <button
          type="button"
          aria-label="Menu"
          aria-expanded={sheet}
          aria-controls="site-sheet"
          onClick={() => setSheet((v) => !v)}
          className="relative h-10 w-10 flex-none rounded-full border border-line-2 bg-surface min-[860px]:hidden"
        >
          <span
            className={`absolute left-[11px] right-[11px] h-0.5 rounded bg-ink transition-[top,transform] duration-200 ${
              sheet ? "top-[18.5px] rotate-45" : "top-[15px]"
            }`}
          />
          <span
            className={`absolute left-[11px] right-[11px] h-0.5 rounded bg-ink transition-[top,transform] duration-200 ${
              sheet ? "top-[18.5px] -rotate-45" : "top-[22px]"
            }`}
          />
        </button>
      </div>

      {sheet && (
        <nav
          id="site-sheet"
          aria-label="Site"
          className="absolute inset-x-0 top-[calc(100%+10px)] max-h-[calc(100dvh-110px)] overflow-y-auto rounded-card border border-line bg-surface-2 p-2.5 shadow-warm-3 min-[860px]:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-ctl px-3 py-3 text-[16px] font-medium text-ink hover:bg-bg ${
                current === l.href ? "bg-bg" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          <p className="kicker px-3 pb-1 pt-3">Features</p>
          <div className="grid grid-cols-2">
            {FEATURES.map((f) => (
              <Link key={f.slug} href={`/features/${f.slug}`} className="rounded-ctl px-3 py-2 text-[15px] text-ink-2 hover:bg-bg">
                {f.nav}
              </Link>
            ))}
          </div>
          <Link href="/sign-in" className="mt-1 block rounded-ctl border-t border-line px-3 py-3 text-[16px] font-semibold text-ink hover:bg-bg">
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
