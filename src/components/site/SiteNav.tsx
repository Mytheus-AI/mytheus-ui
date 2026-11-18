"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowRight, CaretDown } from "@phosphor-icons/react";
import { AGENT_SLUGS, FEATURES } from "@/lib/marketing/features";
import { Wordmark } from "@/components/site/Wordmark";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import s from "@/components/site/nav.module.css";

/* The marketing nav: one calm frosted bar that floats 14px below the top of the window.

   At the top of a page the glass is light and shadowless; once the page moves it firms up (more
   surface, a hairline and a soft warm shadow) so it reads over any section. On the home page the
   hero is always dark, so while the bar sits over it the bar takes the dark token set too
   (`mx-dark`), and hands back to the page's own theme once the hero has scrolled away.

   Wide screens: the mark on the left, the five links centred on the bar, the theme switch, Sign in
   and the one dark Get started on the right. A small coral squiggle sits under the page you are
   on and glides to the link you hover. Features opens a panel of every feature page, grouped.

   Below 900px the links fold into a sheet behind the menu button. The sheet locks the page, moves
   focus to its first link, closes on Escape, a tap outside or a route change, and returns focus to
   the button. Its in-flow height (14 + 62 = 76px) is what the home hero's -76px top margin pulls
   under. */

const LINKS = [
  { href: "/features", label: "Features", menu: true },
  { href: "/pricing", label: "Pricing" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
] as const;

const GROUPS = [
  {
    title: "Your Myte",
    items: FEATURES.filter((f) => AGENT_SLUGS.includes(f.slug)),
  },
  {
    title: "Platform",
    items: FEATURES.filter((f) => !AGENT_SLUGS.includes(f.slug)),
  },
];

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const isHome = pathname === "/";
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [overHero, setOverHero] = useState(isHome);
  const [ind, setInd] = useState<{ x: number; on: boolean }>({
    x: 0,
    on: false,
  });

  const linksRef = useRef<HTMLDivElement>(null);
  const menuWrap = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheetBtn = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const current =
    LINKS.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
      ?.href ?? null;
  const target = hover ?? current;

  /* the squiggle under the current or hovered link */
  useIso(() => {
    const box = linksRef.current;
    if (!box) return;
    const a = target
      ? box.querySelector<HTMLElement>(`[data-href="${target}"]`)
      : null;
    if (!a) return setInd((v) => ({ ...v, on: false }));
    setInd({ x: a.offsetLeft + a.offsetWidth / 2 - 15, on: true });
  }, [target]);

  /* scrolled state, and whether the bar still sits over the home page's dark hero */
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      setOverHero(isHome && y < window.innerHeight - 90);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isHome]);

  useEffect(() => {
    setSheet(false);
    setMenu(false);
  }, [pathname]);

  const closeSheet = useCallback((refocus: boolean) => {
    setSheet(false);
    if (refocus) sheetBtn.current?.focus();
  }, []);

  /* Escape and outside clicks for the features panel and the sheet */
  useEffect(() => {
    if (!menu && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menu) {
        setMenu(false);
        menuBtn.current?.focus();
      }
      if (sheet) closeSheet(true);
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
  }, [menu, sheet, closeSheet]);

  /* the sheet: lock the page behind it, focus its first link, close it if the window widens */
  useEffect(() => {
    if (!sheet) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    sheetRef.current
      ?.querySelector<HTMLElement>("a,button")
      ?.focus({ preventScroll: true });
    const wide = window.matchMedia("(min-width: 900px)");
    const onWide = () => wide.matches && setSheet(false);
    wide.addEventListener("change", onWide);
    return () => {
      html.style.overflow = prev;
      wide.removeEventListener("change", onWide);
    };
  }, [sheet]);

  const solid = scrolled || sheet;

  return (
    <header
      data-site-nav=""
      className={`pointer-events-none sticky top-0 z-50 px-3 pt-3.5 sm:px-6 ${overHero && !sheet ? "mx-dark" : ""}`}
    >
      <div
        data-solid={solid ? "" : undefined}
        className={`${s.bar} pointer-events-auto relative mx-auto grid h-[62px] max-w-[1160px] grid-cols-[1fr_auto] items-center rounded-card pl-4 pr-2 min-[900px]:grid-cols-[1fr_auto_1fr] min-[900px]:pl-5`}
      >
        <Link
          href="/"
          aria-label="Mytheus home"
          className="group flex h-11 w-fit items-center rounded-ctl pr-1"
        >
          <Wordmark size={20} textClassName="text-[21px] translate-y-[-1px]" />
        </Link>

        {/* wide: the links, centred on the bar */}
        <nav aria-label="Main" className="hidden min-[900px]:block">
          <div
            ref={linksRef}
            className="relative flex items-center"
            onMouseLeave={() => setHover(null)}
          >
            {LINKS.map((l) =>
              "menu" in l ? (
                <div key={l.href} ref={menuWrap}>
                  <button
                    ref={menuBtn}
                    type="button"
                    data-href={l.href}
                    aria-expanded={menu}
                    aria-controls="features-menu"
                    onMouseEnter={() => setHover(l.href)}
                    onClick={() => setMenu((m) => !m)}
                    className={`flex items-center gap-1 rounded-ctl px-3 py-2 text-[15px] font-medium transition-colors ${
                      current === l.href || menu
                        ? "text-ink"
                        : "text-ink-3 hover:text-ink"
                    }`}
                  >
                    {l.label}
                    <CaretDown
                      size={12}
                      weight="bold"
                      aria-hidden
                      className={`transition-transform duration-200 ${menu ? "rotate-180" : ""}`}
                    />
                  </button>
                  {menu && <FeaturesPanel pathname={pathname} />}
                </div>
              ) : (
                <Link
                  key={l.href}
                  href={l.href}
                  data-href={l.href}
                  aria-current={current === l.href ? "page" : undefined}
                  onMouseEnter={() => setHover(l.href)}
                  className={`rounded-ctl px-3 py-2 text-[15px] font-medium transition-colors ${
                    current === l.href
                      ? "text-ink"
                      : "text-ink-3 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              ),
            )}
            <svg
              viewBox="0 0 30 7"
              aria-hidden
              className="pointer-events-none absolute -bottom-0.5 left-0 h-[7px] w-[30px] transition-[transform,opacity] duration-[450ms] ease-[cubic-bezier(.215,.61,.355,1)]"
              style={{
                transform: `translateX(${ind.x}px)`,
                opacity: ind.on ? 1 : 0,
              }}
            >
              <path
                d="M2 4.5 Q5.5 0 9 3.5 T16 3.5 T23 3.5 T28 2.5"
                fill="none"
                stroke="var(--signal-line)"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </svg>
          </div>
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          <span className="hidden min-[900px]:block">
            <ThemeToggle />
          </span>
          <span
            aria-hidden
            className="mx-1 hidden h-5 w-px bg-line-2 min-[900px]:block"
          />
          <Link
            href="/sign-in"
            className="hidden h-10 items-center rounded-ctl px-3 text-[15px] font-semibold text-ink transition-colors hover:bg-bg-2 min-[900px]:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="group/cta inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-ctl bg-pill px-3.5 text-[14.5px] font-semibold text-pill-on transition-[background-color,transform] hover:bg-pill-2 motion-safe:active:scale-[.98] min-[900px]:px-4 min-[900px]:text-[15px]"
          >
            Get started
            <ArrowRight
              size={14}
              weight="bold"
              aria-hidden
              className="hidden transition-transform duration-200 group-hover/cta:translate-x-0.5 min-[480px]:block"
            />
          </Link>
          <button
            ref={sheetBtn}
            type="button"
            aria-label={sheet ? "Close menu" : "Open menu"}
            aria-expanded={sheet}
            aria-controls="site-sheet"
            onClick={() => setSheet((v) => !v)}
            className="relative h-10 w-10 flex-none rounded-ctl text-ink transition-colors hover:bg-bg-2 min-[900px]:hidden"
          >
            <span
              aria-hidden
              className={`absolute left-[11px] right-[11px] h-[1.5px] rounded bg-current transition-[top,transform] duration-200 ${
                sheet ? "top-[19.25px] rotate-45" : "top-[15px]"
              }`}
            />
            <span
              aria-hidden
              className={`absolute left-[11px] right-[11px] h-[1.5px] rounded bg-current transition-[top,transform] duration-200 ${
                sheet ? "top-[19.25px] -rotate-45" : "top-[23.5px]"
              }`}
            />
          </button>
        </div>
      </div>

      {sheet && (
        <>
          <div
            aria-hidden
            onClick={() => closeSheet(false)}
            className={`${s.scrim} pointer-events-auto fixed inset-0 -z-10 min-[900px]:hidden`}
          />
          <nav
            ref={sheetRef}
            id="site-sheet"
            aria-label="Site"
            className={`${s.sheet} pointer-events-auto absolute inset-x-3 top-[calc(100%+8px)] max-h-[calc(100dvh-100px)] overflow-y-auto overscroll-contain rounded-card border border-line bg-surface p-2 shadow-warm-3 sm:inset-x-6 min-[900px]:hidden`}
          >
            <ul>
              {LINKS.filter((l) => !("menu" in l)).map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={current === l.href ? "page" : undefined}
                    className={`flex items-center justify-between rounded-ctl px-3.5 py-3 text-[17px] font-semibold text-ink transition-colors hover:bg-bg ${
                      current === l.href ? "bg-bg" : ""
                    }`}
                  >
                    {l.label}
                    {current === l.href && (
                      <svg
                        viewBox="0 0 30 7"
                        aria-hidden
                        className="h-[7px] w-[30px]"
                      >
                        <path
                          d="M2 4.5 Q5.5 0 9 3.5 T16 3.5 T23 3.5 T28 2.5"
                          fill="none"
                          stroke="var(--signal-line)"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mx-1.5 mt-2 rounded-card bg-bg p-2">
              <Link
                href="/features"
                className="flex items-center justify-between rounded-ctl px-2 py-2 text-[14px] font-semibold text-ink hover:text-signal-ink"
              >
                Features
                <span className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-3">
                  See all <ArrowRight size={12} weight="bold" aria-hidden />
                </span>
              </Link>
              {GROUPS.map((g) => (
                <div key={g.title} className="mt-1">
                  <p className="px-2 pb-1 pt-2 text-[12.5px] font-semibold text-ink-3">
                    {g.title}
                  </p>
                  <ul className="grid grid-cols-2 gap-x-1">
                    {g.items.map((f) => (
                      <li key={f.slug}>
                        <Link
                          href={`/features/${f.slug}`}
                          aria-current={
                            pathname === `/features/${f.slug}`
                              ? "page"
                              : undefined
                          }
                          className={`block rounded-ctl px-2 py-2 text-[15px] text-ink-2 transition-colors hover:bg-surface hover:text-ink ${
                            pathname === `/features/${f.slug}`
                              ? "bg-surface text-ink"
                              : ""
                          }`}
                        >
                          {f.nav}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between px-3.5 py-1.5">
              <span className="text-[14px] font-medium text-ink-3">
                Appearance
              </span>
              <ThemeToggle />
            </div>
            <div className="grid grid-cols-2 gap-2 p-1.5">
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-ctl border border-line-2 text-[15px] font-semibold text-ink transition-colors hover:bg-bg"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center justify-center rounded-ctl bg-pill text-[15px] font-semibold text-pill-on transition-colors hover:bg-pill-2"
              >
                Get started free
              </Link>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}

/* The features panel on wide screens: the agent features and the platform features side by side,
   each with its one-line blurb, and the hub at the foot. */
function FeaturesPanel({ pathname }: { pathname: string }) {
  return (
    <div
      id="features-menu"
      className={`${s.panel} absolute left-1/2 top-[calc(100%+20px)] w-[min(680px,92vw)] -translate-x-1/2 rounded-card border border-line bg-surface p-2 shadow-warm-3`}
    >
      <div className="grid grid-cols-2 gap-2">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 pt-2.5 text-[12.5px] font-semibold text-ink-3">
              {g.title}
            </p>
            <ul>
              {g.items.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/features/${f.slug}`}
                    aria-current={
                      pathname === `/features/${f.slug}` ? "page" : undefined
                    }
                    className={`group/item block rounded-ctl px-3 py-2 transition-colors hover:bg-bg ${
                      pathname === `/features/${f.slug}` ? "bg-bg" : ""
                    }`}
                  >
                    <span className="block text-[14.5px] font-semibold text-ink">
                      {f.nav}
                    </span>
                    <span className="mt-0.5 line-clamp-1 text-[13px] text-ink-3">
                      {f.blurb}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Link
        href="/features"
        className="group/all mt-2 flex items-center justify-between rounded-ctl bg-bg px-3 py-3 text-[14px] font-semibold text-ink transition-colors hover:bg-bg-2"
      >
        <span>
          Every feature in one place
          <span className="ml-2 font-normal text-ink-3">
            Free to start. No bot joins your call.
          </span>
        </span>
        <ArrowRight
          size={14}
          weight="bold"
          aria-hidden
          className="text-signal transition-transform duration-200 group-hover/all:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
