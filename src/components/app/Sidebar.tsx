"use client";

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

const LABEL_RAIL =
  "w-0 opacity-0 group-hover/sb:w-auto group-hover/sb:opacity-100 group-focus-within/sb:w-auto group-focus-within/sb:opacity-100";

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
  const label = railed ? LABEL_RAIL : "";

  const width = drawer
    ? "relative h-full w-[252px] shadow-[0_24px_60px_-24px_rgba(40,30,20,0.5)]"
    : railed
      ? "absolute inset-y-0 left-0 w-[76px] hover:w-[252px] focus-within:w-[252px] hover:bg-surface focus-within:bg-surface hover:shadow-[0_18px_40px_-8px_rgba(60,45,35,0.25)] focus-within:shadow-[0_18px_40px_-8px_rgba(60,45,35,0.25)]"
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
        title={railed ? it.label : undefined}
        className={`flex h-[42px] items-center gap-3 rounded-pill px-3 text-[14px] font-semibold transition-colors duration-150 active:scale-[0.98] ${
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
      className={`group/sb sb-panel flex flex-col border-r border-line bg-bg px-3 pb-3 pt-3.5 ${width}`}
    >
      <div className="flex h-[52px] items-center gap-2.5 px-2.5 pb-3.5 pt-1.5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Mytheus home"
          className="inline-flex items-center gap-2.5 text-ink"
        >
          <LogoMark size={24} className="text-signal" />
          <span className={`sb-fade display text-[21px] ${label}`}>Mytheus</span>
        </Link>
        {!drawer && onToggleRail && (
          <button
            type="button"
            onClick={onToggleRail}
            aria-label={rail ? "Keep sidebar open" : "Collapse sidebar"}
            className={`sb-fade ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink ${label}`}
          >
            <SidebarSimple size={18} />
          </button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2.5 rounded-pill border border-line bg-surface px-2.5 py-2">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-pill text-[13px] font-bold text-white">
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <span className={`sb-fade min-w-0 ${label}`}>
          <span className="block truncate text-[13.5px] font-semibold leading-tight text-ink">
            {org.name}
          </span>
          <span className="block text-[12px] capitalize text-ink-3">{org.plan} plan</span>
        </span>
      </div>

      <nav className="-mx-1.5 flex-1 overflow-y-auto overflow-x-hidden px-1.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label ?? "root"} className="mb-4">
            {section.label && (
              <p
                className={`sb-fade h-6 px-3 pb-2 pt-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-3 ${
                  railed ? "opacity-0 group-hover/sb:opacity-100 group-focus-within/sb:opacity-100" : ""
                }`}
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
              className={`sb-fade h-6 px-3 pb-2 pt-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-3 ${
                railed ? "opacity-0 group-hover/sb:opacity-100 group-focus-within/sb:opacity-100" : ""
              }`}
            >
              Admin
            </p>
            <div className="flex flex-col gap-0.5">{ADMIN_ITEMS.map((i) => item(i, true))}</div>
          </div>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-line px-2 pt-3">
        <Avatar name={user.name} size="sm" />
        <span className={`sb-fade min-w-0 flex-1 ${label}`}>
          <span className="block truncate text-[13px] font-semibold text-ink">{user.name}</span>
          <span className="block truncate text-[12px] text-ink-3">{user.email}</span>
        </span>
        <button
          type="button"
          onClick={() => void signOut({ redirectUrl: "/" })}
          aria-label="Sign out"
          className={`sb-fade grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink ${label}`}
        >
          <SignOut size={18} />
        </button>
      </div>
    </aside>
  );
}
