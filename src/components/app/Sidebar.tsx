"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretUpDown, Plus, SidebarSimple, X } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";
import { Wordmark } from "@/components/site/Wordmark";
import { AgentOrb } from "@/components/agent/AgentOrb";
import { defaultDoodleSeed } from "@/lib/doodle";
import { buttonClass } from "@/components/ui/Button";
import { countLabel } from "@/lib/inbox";
import {
  ADMIN_ITEMS,
  AGENT_ITEM,
  FOOT_ITEMS,
  MAIN_ITEMS,
  NEW_MEETING_HREF,
  currentNavHref,
  type NavItem,
} from "@/components/app/nav";

/* The app sidebar. Two modes, both of them real navigation:
   - expanded: a 252px column with grouped, labelled items.
   - rail: a 76px icon column that opens to 252px over the page while hovered or keyboard-focused,
     so the content never reflows. The choice is the user's (the pin button) and is remembered.
   `drawer` renders it full width with a close button and no rail behaviour, for the small-screen
   overlay. The current page is marked by two signals only: a white card and a coral icon.
   The Inbox row carries its open count (from the shell, refreshed as you work).
   Up and Down arrows move between items, as in a menu; Tab still walks them in order. */

/* Rail labels open with the panel: on hover, or on KEYBOARD focus. Not `focus-within`: a mouse click
   leaves focus on the clicked link or button, which kept the panel open after the pointer had gone. */
const PEEK_SHOW =
  "group-hover/sb:w-auto group-hover/sb:!flex-1 group-hover/sb:opacity-100 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:!flex-1 group-has-[:focus-visible]/sb:opacity-100";

type Lay = { open: string; rail: string; peek: string };

/* Collapsed-rail layout, and the classes that restore the full layout while the rail is open. Written
   out in full because Tailwind only generates classes it can read literally. Collapsed, every row is
   a centred 44px square with no gap (a zero-width label still took its gap and pushed icons
   off-centre), group titles become a short hairline, and the org block drops its box. */
const ROW: Lay = {
  open: "gap-3 px-3",
  rail: "mx-auto w-11 justify-center gap-0 px-0",
  peek: "group-hover/sb:mx-0 group-hover/sb:w-auto group-hover/sb:justify-start group-hover/sb:gap-3 group-hover/sb:px-3 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-3 group-has-[:focus-visible]/sb:px-3",
};
const BRAND: Lay = {
  open: "gap-2 pl-2.5 pr-0.5",
  rail: "justify-center gap-0 px-0",
  peek: "group-hover/sb:justify-start group-hover/sb:gap-2 group-hover/sb:pl-2.5 group-hover/sb:pr-0.5 group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-2 group-has-[:focus-visible]/sb:pl-2.5 group-has-[:focus-visible]/sb:pr-0.5",
};
const MARK_GAP: Lay = {
  open: "",
  rail: "!gap-0",
  peek: "group-hover/sb:!gap-2.5 group-has-[:focus-visible]/sb:!gap-2.5",
};
const ORG: Lay = {
  open: "gap-2.5 border-line bg-surface px-2.5 py-2",
  rail: "justify-center gap-0 border-transparent bg-transparent px-0 py-1",
  peek: "group-hover/sb:justify-start group-hover/sb:gap-2.5 group-hover/sb:border-line group-hover/sb:bg-surface group-hover/sb:px-2.5 group-hover/sb:py-2 group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-2.5 group-has-[:focus-visible]/sb:border-line group-has-[:focus-visible]/sb:bg-surface group-has-[:focus-visible]/sb:px-2.5 group-has-[:focus-visible]/sb:py-2",
};
const CTA: Lay = {
  open: "w-full justify-start gap-2.5 px-3",
  rail: "mx-auto w-11 justify-center !gap-0 !px-0",
  peek: "group-hover/sb:mx-0 group-hover/sb:w-full group-hover/sb:justify-start group-hover/sb:!gap-2.5 group-hover/sb:!px-3 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:w-full group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:!gap-2.5 group-has-[:focus-visible]/sb:!px-3",
};
// Collapsed, a group title becomes a short hairline between groups (its text stays for screen
// readers, just transparent); open, it is the label again.
const HEAD: Lay = {
  open: "h-7 px-3 pb-1.5 pt-1 text-ink-3",
  rail: "mx-auto mb-2.5 mt-1 h-px w-6 bg-line p-0 text-transparent",
  peek: "group-hover/sb:mx-0 group-hover/sb:mb-0 group-hover/sb:mt-0 group-hover/sb:h-7 group-hover/sb:w-auto group-hover/sb:bg-transparent group-hover/sb:px-3 group-hover/sb:pb-1.5 group-hover/sb:pt-1 group-hover/sb:text-ink-3 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:mb-0 group-has-[:focus-visible]/sb:mt-0 group-has-[:focus-visible]/sb:h-7 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:bg-transparent group-has-[:focus-visible]/sb:px-3 group-has-[:focus-visible]/sb:pb-1.5 group-has-[:focus-visible]/sb:pt-1 group-has-[:focus-visible]/sb:text-ink-3",
};
// The agent tab: face and name open, the face alone in the rail.
const AGENT: Lay = {
  open: "gap-3 px-2.5 py-2",
  rail: "mx-auto w-11 justify-center gap-0 px-0 py-1",
  peek: "group-hover/sb:mx-0 group-hover/sb:w-auto group-hover/sb:justify-start group-hover/sb:gap-3 group-hover/sb:px-2.5 group-hover/sb:py-2 group-has-[:focus-visible]/sb:mx-0 group-has-[:focus-visible]/sb:w-auto group-has-[:focus-visible]/sb:justify-start group-has-[:focus-visible]/sb:gap-3 group-has-[:focus-visible]/sb:px-2.5 group-has-[:focus-visible]/sb:py-2",
};

/** A meeting the signed-in person is in right now, for the in-call card. */
export type LiveCall = { href: string; title: string };

/** The signed-in person's agent as the sidebar draws it. */
export type SidebarAgent = { name: string; seed: string };

/* Up/Down move between the sidebar's items, Home/End jump to the ends. */
function onNavKey(e: KeyboardEvent<HTMLElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-sb-item]"));
  const at = items.indexOf(document.activeElement as HTMLElement);
  if (at === -1) return;
  e.preventDefault();
  const next =
    e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
  items[next]?.focus();
}

export function Sidebar({
  rail = false,
  drawer = false,
  liveCall = null,
  agent = null,
  inboxCount = null,
  onToggleRail,
  onNavigate,
  onClose,
}: {
  /** open items in the Inbox; null hides the number */
  inboxCount?: number | null;
  rail?: boolean;
  drawer?: boolean;
  /** shown as the in-call card; null hides it */
  liveCall?: LiveCall | null;
  /** the person's agent for the agent tab; null draws it from their name */
  agent?: SidebarAgent | null;
  onToggleRail?: () => void;
  onNavigate?: () => void;
  /** drawer only: closes the overlay */
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { org, user } = useOrgContext();
  const isAdmin = user.role === "admin";
  const railed = rail && !drawer;
  // Set when the user collapses with the pointer still over the panel; cleared when it leaves.
  // Without it the hover rule reopens the rail under the cursor the instant it collapses.
  const [holdClosed, setHoldClosed] = useState(false);
  const peekable = railed && !holdClosed;
  // Collapsed, a label takes no room at all: `flex-none` matters, because a zero-width `flex-1` label
  // still grows to fill the row and pushes the icon off the rail's centre line.
  const label = railed ? (peekable ? `w-0 !flex-none opacity-0 ${PEEK_SHOW}` : "w-0 !flex-none opacity-0") : "";
  // The Inbox count pill: hidden in the collapsed rail (its padding would push the icon off centre;
  // the dot on the icon says it instead), back when the panel opens.
  const pillShow = railed
    ? peekable
      ? "hidden group-hover/sb:inline-block group-has-[:focus-visible]/sb:inline-block"
      : "hidden"
    : "";
  // A hairline between the rail's groups; gone while the panel is open.
  const railRule = railed
    ? `mx-auto mb-3 h-px w-6 shrink-0 bg-line ${peekable ? "group-hover/sb:hidden group-has-[:focus-visible]/sb:hidden" : ""}`
    : "hidden";
  const lay = (c: Lay) => (railed ? (peekable ? `${c.rail} ${c.peek}` : c.rail) : c.open);
  // Only shown while the panel is open: hidden (taking no space) in the collapsed rail.
  const openOnly = railed
    ? peekable
      ? "hidden group-hover/sb:grid group-has-[:focus-visible]/sb:grid"
      : "hidden"
    : "grid";

  // The deepest matching href wins, so /tenant/usage does not also light up /tenant.
  const current = currentNavHref(pathname, [AGENT_ITEM, ...MAIN_ITEMS, ...(isAdmin ? ADMIN_ITEMS : []), ...FOOT_ITEMS]);

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
    ? "relative h-full w-[252px] bg-surface shadow-warm-3"
    : railed
      ? peekable
        ? "absolute inset-y-0 left-0 w-[76px] hover:w-[252px] has-[:focus-visible]:w-[252px] hover:bg-surface has-[:focus-visible]:bg-surface hover:shadow-warm-3 has-[:focus-visible]:shadow-warm-3"
        : "absolute inset-y-0 left-0 w-[76px]"
      : "absolute inset-y-0 left-0 w-[252px]";

  const item = (it: NavItem) => {
    const active = current === it.href;
    const Icon = it.icon;
    const badge = it.count === "inbox" ? countLabel(inboxCount) : null;
    return (
      <Link
        key={it.href}
        href={it.href}
        onClick={onNavigate}
        data-sb-item=""
        aria-current={active ? "page" : undefined}
        aria-label={badge ? `${it.label}, ${inboxCount} waiting` : undefined}
        className={`relative flex h-[42px] shrink-0 items-center ${lay(ROW)} rounded-ctl text-[14px] font-semibold transition-[background-color,color,transform] duration-150 motion-safe:active:scale-[0.98] ${
          active ? "bg-surface text-ink" : "text-ink-3 hover:bg-bg-2 hover:text-ink"
        }`}
      >
        <span className="relative inline-flex shrink-0">
          <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden className={active ? "text-signal" : ""} />
          {badge && railed ? (
            <span
              aria-hidden
              className={`absolute -right-1.5 -top-1 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-bg ${peekable ? "group-hover/sb:hidden group-has-[:focus-visible]/sb:hidden" : ""}`}
            />
          ) : null}
        </span>
        <span className={`sb-fade min-w-0 flex-1 ${label}`}>{it.label}</span>
        {badge ? (
          <span
            aria-hidden
            className={`sb-fade ml-auto shrink-0 rounded-full bg-signal-soft px-2 py-px text-[12.5px] font-semibold tabular-nums text-signal-ink ${pillShow}`}
          >
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const groupTitle = (text: string) => (
    <p className={`sb-fade ${lay(HEAD)} text-[12.5px] font-semibold`}>{text}</p>
  );

  return (
    <aside
      aria-label="Primary"
      onMouseLeave={() => setHoldClosed(false)}
      onKeyDown={onNavKey}
      className={`group/sb sb-panel flex flex-col border-r border-line bg-bg px-3 pb-3 pt-3.5 ${width}`}
    >
      <div className={`flex h-[52px] shrink-0 items-center ${lay(BRAND)} pb-3 pt-1`}>
        <Link href="/dashboard" onClick={onNavigate} aria-label="Mytheus home" className="group rounded-ctl">
          <Wordmark size={21} className={lay(MARK_GAP)} textClassName={`sb-fade text-[21px] ${label}`} />
        </Link>
        {drawer && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
          >
            <X size={18} aria-hidden />
          </button>
        ) : null}
        {!drawer && onToggleRail ? (
          <button
            type="button"
            onClick={toggleRail}
            aria-label={rail ? "Keep sidebar open" : "Collapse sidebar"}
            title={rail ? "Keep sidebar open" : "Collapse sidebar"}
            className={`ml-auto h-8 w-8 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink ${openOnly}`}
          >
            <SidebarSimple size={18} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Opens the workspace chooser: switch to another workspace you belong to, or accept an
          invitation to one. `switch=1` keeps the chooser open for someone who already has an
          active workspace (it otherwise sends them straight on to the dashboard). */}
      <Link
        href="/onboarding/organization?switch=1"
        onClick={onNavigate}
        data-sb-item=""
        title="Switch workspace or accept an invitation"
        aria-label={`${org.name}: switch workspace`}
        className={`mb-3 flex shrink-0 items-center rounded-ctl border transition-colors hover:border-line-2 ${lay(ORG)}`}
      >
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-pill text-[12.5px] font-bold text-pill-on">
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={`sb-fade min-w-0 flex-1 ${label}`}>
          <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{org.name}</span>
          <span className="block text-[12.5px] text-ink-3">{isAdmin ? "Workspace admin" : "Member"}</span>
        </span>
        <CaretUpDown size={16} aria-hidden className={`shrink-0 text-ink-3 ${openOnly}`} />
      </Link>

      <Link
        href={NEW_MEETING_HREF}
        onClick={onNavigate}
        data-sb-item=""
        aria-label="New meeting"
        className={`${buttonClass({ variant: "primary", size: "md" })} mb-3.5 !flex ${lay(CTA)}`}
      >
        <Plus size={18} weight="bold" aria-hidden className="shrink-0" />
        <span className={`sb-fade ${label}`}>New meeting</span>
      </Link>

      <AgentTab
        agent={agent ?? { name: `${user.name.split(" ")[0] || "Your"}'s agent`, seed: defaultDoodleSeed(`agent:${user.id}`) }}
        active={current === AGENT_ITEM.href}
        layout={lay(AGENT)}
        label={label}
        onNavigate={onNavigate}
      />
      <div aria-hidden className={railRule} />

      {liveCall ? (
        <Link
          href={liveCall.href}
          onClick={onNavigate}
          data-sb-item=""
          aria-label={`Back to your call: ${liveCall.title}`}
          className={`mb-3.5 flex min-h-[44px] shrink-0 items-center rounded-ctl bg-pill py-2 text-pill-on transition-colors hover:bg-pill-2 ${lay(CTA)}`}
        >
          <span aria-hidden className="relative grid h-5 w-5 shrink-0 place-items-center">
            <span className="absolute h-2.5 w-2.5 rounded-full bg-priority-high motion-safe:animate-ping motion-safe:opacity-60" />
            <span className="h-2.5 w-2.5 rounded-full bg-priority-high" />
          </span>
          <span className={`sb-fade min-w-0 ${label}`}>
            <span className="block text-[12.5px] font-semibold leading-tight">In call</span>
            <span className="block truncate text-[12.5px] opacity-75">{liveCall.title}</span>
          </span>
        </Link>
      ) : null}

      <nav aria-label="Main" className="-mx-1.5 flex-1 overflow-y-auto overflow-x-hidden px-1.5">
        <div className="mb-3 flex flex-col gap-0.5">{MAIN_ITEMS.map(item)}</div>
        {isAdmin ? (
          <div className="mb-3">
            {groupTitle("Admin")}
            <div className="flex flex-col gap-0.5">{ADMIN_ITEMS.map(item)}</div>
          </div>
        ) : null}
      </nav>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-line pt-2.5">{FOOT_ITEMS.map(item)}</div>
    </aside>
  );
}

/* Your agent's own row: its face in a static dashed coral orbit (it is listening on your behalf),
   its name, and "Your agent" in the accent ink. No other row has a face or an orbit, so it reads
   as a someone, not a screen. Open: the orbit closes into a solid ring and the row turns to a
   white card like any current item. */
function AgentTab({
  agent,
  active,
  layout,
  label,
  onNavigate,
}: {
  agent: SidebarAgent;
  active: boolean;
  layout: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={AGENT_ITEM.href}
      onClick={onNavigate}
      data-sb-item=""
      aria-current={active ? "page" : undefined}
      aria-label={`${agent.name}, your agent`}
      title={`${agent.name}, your agent`}
      className={`relative mb-3.5 flex min-h-[52px] shrink-0 items-center rounded-card transition-[background-color,transform] duration-150 motion-safe:active:scale-[0.98] ${layout} ${
        active ? "bg-surface" : "hover:bg-bg-2"
      }`}
    >
      <span className="relative grid h-[38px] w-[38px] shrink-0 place-items-center">
        <svg viewBox="0 0 38 38" aria-hidden className={`sb-orbit absolute inset-0 h-full w-full ${active ? "is-active" : ""}`}>
          <circle cx="19" cy="19" r="17.5" fill="none" stroke="var(--signal-line)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="block h-[30px] w-[30px] overflow-hidden rounded-full bg-surface ring-2 ring-surface">
          <AgentOrb seed={agent.seed} size={30} />
        </span>
      </span>
      <span className={`sb-fade min-w-0 flex-1 ${label}`}>
        <span className="block truncate text-[14px] font-semibold leading-tight text-ink">{agent.name}</span>
        <span className="block text-[12.5px] font-medium text-signal-ink">Your agent</span>
      </span>
    </Link>
  );
}
