import type { Icon } from "@phosphor-icons/react";
import {
  CreditCard,
  GearSix,
  Gauge,
  House,
  Scales,
  Sparkle,
  ShieldCheck,
  TreeStructure,
  VideoCamera,
  CheckSquare,
  ChartBar,
  UsersThree,
} from "@phosphor-icons/react";

export type NavItem = { href: string; label: string; icon: Icon };
export type NavSection = { label: string | null; items: NavItem[] };

/* The app nav, sectioned to match the doc-20 screen inventory. One list feeds the sidebar, the
   topbar title and the command palette, so a new screen is added in exactly one place. */
export const NAV_SECTIONS: NavSection[] = [
  { label: null, items: [{ href: "/dashboard", label: "Home", icon: House }] },
  {
    label: "Workspace",
    items: [
      { href: "/meetings", label: "Meetings", icon: VideoCamera },
      { href: "/decisions", label: "Decisions", icon: Scales },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/org", label: "Org chart", icon: TreeStructure },
      { href: "/search", label: "Ask", icon: Sparkle },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings", icon: GearSix },
      { href: "/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

/* Shown to workspace owners and admins: the tenant admin console (doc 20 section 7). */
export const ADMIN_ITEMS: NavItem[] = [
  { href: "/tenant", label: "Workspace admin", icon: UsersThree },
  { href: "/tenant/usage", label: "Usage", icon: ChartBar },
];

/* Platform-staff consoles (every tenant, ops). Not in the workspace nav: no staff role exists
   in the session yet, so they stay reachable by URL only. */
export const PLATFORM_ITEMS: NavItem[] = [
  { href: "/admin", label: "Admin console", icon: ShieldCheck },
  { href: "/ops", label: "Ops console", icon: Gauge },
];

export function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}
