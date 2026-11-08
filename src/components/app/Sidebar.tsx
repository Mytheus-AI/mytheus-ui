"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { SidebarSimple, SignOut } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/Logo";
import { ADMIN_ITEMS, NAV_SECTIONS, isActive, type NavItem } from "@/components/app/nav";

/* The app sidebar. Two modes, both of them real navigation:
   - expanded: a 252px column with labelled groups.
   - rail: a 76px icon column that opens to 252px over the page while hovered or focused, so the
     content never reflows. The choice is the user's (pin button) and is remembered.
   `drawer` renders it full width with no rail behaviour, for the small-screen overlay. */

/* Rail labels open with the panel: on hover, or on KEYBOARD focus. Not `focus-within`: a mouse click
   leaves focus on the clicked link or button, which kept the panel open after the pointer had gone. */
const LABEL_PEEK =
  "w-0 opacity-0 group-hover/sb:w-auto group-hover/sb:opacity-100 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:opacity-100";

/* Collapsed-rail layout, and the classes that restore the full layout while the rail is open. Written
   out in full because Tailwind only generates classes it can read literally. Collapsed, every row
   centres its icon with no gap (a zero-width label still took its gap and pushed icons off-centre),
   section labels take no height (they left uneven holes), and the org block drops its box. */
// Collapsed, each item is a centred 44px square, so the active one reads as a tile, not a slab.
const ROW = { open: "gap-3 px-3", rail: "mx-auto w-11 justify-center gap-0 px-0",
  peek: "group-hover/sb:mx-0 group-hover/sb:w-auto group-hover/sb:justify-start group-hover/sb:gap-3 group-hover/sb:px-3 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-3 group-has-[:focus-visible]/sb:px-3" };
const BRAND = { open: "gap-2.5 px-2.5", rail: "justify-center gap-0 px-0",
  peek: "group-hover/sb:justify-start group-hover/sb:gap-2.5 group-hover/sb:px-2.5 group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-2.5 group-has-[:focus-visible]/sb:px-2.5" };
const ORG = { open: "gap-2.5 border-line bg-surface px-2.5 py-2", rail: "justify-center gap-0 border-transparent bg-transparent px-0 py-1",
  peek: "group-hover/sb:justify-start group-hover/sb:gap-2.5 group-hover/sb:border-line group-hover/sb:bg-surface group-hover/sb:px-2.5 group-hover/sb:py-2 group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-2.5 group-has-[:focus-visible]/sb:border-line group-has-[:focus-visible]/sb:bg-surface group-has-[:focus-visible]/sb:px-2.5 group-has-[:focus-visible]/sb:py-2" };
// Collapsed, a section label becomes a short hairline between groups (its text stays for screen
// readers, just transparent); open, it is the label again.
const HEAD = { open: "h-6 px-3 pb-2 pt-1 text-ink-3", rail: "mx-auto mb-2.5 mt-0.5 h-px w-6 bg-line p-0 text-transparent",
  peek: "group-hover/sb:mx-0 group-hover/sb:mb-0 group-hover/sb:mt-0 group-hover/sb:h-6 group-hover/sb:w-auto group-hover/sb:bg-transparent group-hover/sb:px-3 group-hover/sb:pb-2 group-hover/sb:pt-1 group-hover/sb:text-ink-3 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:mb-0 group-has-[:focus-visible]/sb:mt-0 group-has-[:focus-visible]/sb:h-6 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:bg-transparent group-has-[:focus-visible]/sb:px-3 group-has-[:focus-visible]/sb:pb-2 group-has-[:focus-visible]/sb:pt-1 group-has-[:focus-visible]/sb:text-ink-3" };
const FOOT = { open: "gap-2.5 px-2", rail: "justify-center gap-0 px-0",
  peek: "group-hover/sb:justify-start group-hover/sb:gap-2.5 group-hover/sb:px-2 group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-2.5 group-has-[:focus-visible]/sb:px-2" };

export function Sidebar({
  rail = false,
  drawer = false,
  onToggleRail,
  onNavigate,
}: {
  rail?: boolean;
  drawer?: boolean;
  onToggleRail?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { org, user } = useOrgContext();
  const { signOut } = useClerk();
  const railed = rail && !drawer;
  // Set when the user collapses with the pointer still over the panel; cleared when it leaves.
  // Without it the hover rule reopens the rail under the cursor the instant it collapses.
  const [holdClosed, setHoldClosed] = useState(false);
  const peekable = railed && !holdClosed;
  const label = railed ? (peekable ? LABEL_PEEK : "w-0 opacity-0") : "";
  const lay = (c: { open: string; rail: string; peek: string }) =>
    railed ? (peekable ? `${c.rail} ${c.peek}` : c.rail) : c.open;

  const toggleRail = (e: MouseEvent<HTMLButtonElement>) => {
    if (!rail) {
      setHoldClosed(true);
      // A pointer click (detail > 0) should not leave the panel held open by focus; a keyboard
      // press keeps focus where the user is.
      if (e.detail > 0) e.currentTarget.blur();
    }
    onToggleRail?.();
  };

  const width = drawer
    ? "relative h-full w-[252px] shadow-[0_24px_60px_-24px_rgba(40,30,20,0.5)]"
    : railed
      ? peekable
        ? "absolute inset-y-0 left-0 w-[76px] hover:w-[252px] has-[:focus-visible]:w-[252px] hover:bg-surface has-[:focus-visible]:bg-surface hover:shadow-[0_18px_40px_-8px_rgba(60,45,35,0.25)] has-[:focus-visible]:shadow-[0_18px_40px_-8px_rgba(60,45,35,0.25)]"
        : "absolute inset-y-0 left-0 w-[76px]"
      : "absolute inset-y-0 left-0 w-[252px]";

  const item = (it: NavItem, dashed = false) => {
    const active = isActive(pathname, it.href);
    const Icon = it.icon;
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={`flex h-[42px] items-center ${lay(ROW)} rounded-pill text-[14px] font-semibold transition-colors duration-150 active:scale-[0.98] ${
          active
            ? "border border-line bg-surface text-ink shadow-sm"
            : `border border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink ${dashed ? "border-dashed border-line" : ""}`
        }`}
      >
        <Icon size={20} weight={active ? "fill" : "regular"} className={active ? "text-signal" : ""} />
        <span className={`sb-fade ${label}`}>{it.label}</span>
      </Link>
    );
  };

  return (
    <aside
      aria-label="Primary"
      onMouseLeave={() => setHoldClosed(false)}
      className={`group/sb sb-panel flex flex-col border-r border-line bg-bg px-3 pb-3 pt-3.5 ${width}`}
    >
      <div className={`flex h-[52px] items-center ${lay(BRAND)} pb-3.5 pt-1.5`}>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Mytheus home"
          className={`inline-flex items-center text-ink ${
            railed
              ? peekable
                ? "gap-0 group-hover/sb:gap-2.5 group-has-[:focus-visible]/sb:gap-2.5"
                : "gap-0"
              : "gap-2.5"
          }`}
        >
          <LogoMark size={24} className="text-signal" />
          <span className={`sb-fade display text-[21px] ${label}`}>Mytheus</span>
        </Link>
        {!drawer && onToggleRail && (
          <button
            type="button"
            onClick={toggleRail}
            aria-label={rail ? "Keep sidebar open" : "Collapse sidebar"}
            className={`ml-auto h-8 w-8 shrink-0 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink ${
              // Takes no space in the collapsed rail, so the logo can centre; back when the rail opens.
              railed
                ? peekable
                  ? "hidden group-hover/sb:grid group-has-[:focus-visible]/sb:grid"
                  : "hidden"
                : "grid"
            }`}
          >
            <SidebarSimple size={18} />
          </button>
        )}
      </div>

      {/* Opens the workspace chooser: switch to another workspace you belong to, or accept an
          invitation to one. `switch=1` keeps the chooser open for someone who already has an
          active workspace (it otherwise sends them straight on to the dashboard). */}
      <Link
        href="/onboarding/organization?switch=1"
        title="Switch workspace or accept an invitation"
        aria-label={`${org.name}: switch workspace`}
        className={`mb-3 flex items-center rounded-pill border transition-colors hover:border-line-2 ${lay(ORG)}`}
      >
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-pill text-[13px] font-bold text-white">
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={`sb-fade min-w-0 ${label}`}>
          <span className="block truncate text-[13.5px] font-semibold leading-tight text-ink">
            {org.name}
          </span>
          <span className="block text-[12px] capitalize text-ink-3">{org.plan} plan</span>
        </span>
      </Link>

      <nav className="-mx-1.5 flex-1 overflow-y-auto overflow-x-hidden px-1.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label ?? "root"} className="mb-4">
            {section.label && (
              <p
                className={`sb-fade ${lay(HEAD)} text-[11.5px] font-bold uppercase tracking-[0.06em]`}
              >
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">{section.items.map((i) => item(i))}</div>
          </div>
        ))}
        {user.role === "admin" && (
          <div className="mb-4">
            <p
              className={`sb-fade ${lay(HEAD)} text-[11.5px] font-bold uppercase tracking-[0.06em]`}
            >
              Admin
            </p>
            <div className="flex flex-col gap-0.5">{ADMIN_ITEMS.map((i) => item(i, true))}</div>
          </div>
        )}
      </nav>

      <div className={`flex items-center ${lay(FOOT)} border-t border-line pt-3`}>
        <Avatar name={user.name} id={user.email} seed={user.avatarSeed} src={user.imageUrl} size="md" />
        <span
          className={`sb-fade min-w-0 ${label} ${
            // flex-1 would stretch the hidden name and push the avatar off-centre in the rail.
            railed
              ? peekable
                ? "flex-none group-hover/sb:flex-1 group-has-[:focus-visible]/sb:flex-1"
                : "flex-none"
              : "flex-1"
          }`}
        >
          <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{user.email}</span>
        </span>
        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: "/" })}
          aria-label="Sign out"
          className={`h-8 w-8 shrink-0 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink ${
            // Takes no space in the collapsed rail, so the avatar can centre.
            railed
              ? peekable
                ? "hidden group-hover/sb:grid group-has-[:focus-visible]/sb:grid"
                : "hidden"
              : "grid"
          }`}
        >
          <SignOut size={18} />
        </button>
      </div>
    </aside>
  );
}
