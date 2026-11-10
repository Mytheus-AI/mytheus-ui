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
} from "@phosphor-icons/react/ssr";

export type NavItem = { href: string; label: string; icon: Icon };
export type NavSection = { label: string | null; items: NavItem[] };

/* The app nav, grouped as in the design previews. One list feeds the sidebar, the topbar title
   and the command palette, so a new screen is added in exactly one place. */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Home", icon: House },
      { href: "/meetings", label: "Meetings", icon: VideoCamera },
      { href: "/decisions", label: "Decisions", icon: Scales },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Find",
    items: [
      { href: "/search", label: "Ask Mytheus", icon: Sparkle },
      { href: "/org", label: "Org chart", icon: TreeStructure },
    ],
  },
];

/* Account screens sit at the foot of the sidebar, apart from the work. */
export const FOOT_ITEMS: NavItem[] = [
  { href: "/settings", label: "Settings", icon: GearSix },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

/* Shown to workspace owners and admins: the tenant admin console (doc 20 section 7). */
export const ADMIN_ITEMS: NavItem[] = [
  { href: "/tenant", label: "Workspace admin", icon: UsersThree },
  { href: "/tenant/usage", label: "Usage", icon: ChartBar },
];

/* Platform-staff consoles (every tenant, ops). Not in the workspace nav: staff status is only
   known after `GET /admin/ops/whoami`, so they stay reachable by URL, behind that gate. */
export const PLATFORM_ITEMS: NavItem[] = [
  { href: "/admin", label: "Admin console", icon: ShieldCheck },
  { href: "/ops", label: "Ops console", icon: Gauge },
];

/** Where the primary "New meeting" control goes: the meetings hub, asked to open its form. */
export const NEW_MEETING_HREF = "/meetings?new=1";

/** Every screen a signed-in person can jump to, for the palette and the topbar title. */
export function allNavItems(isAdmin: boolean): NavItem[] {
  return [...NAV_SECTIONS.flatMap((s) => s.items), ...FOOT_ITEMS, ...(isAdmin ? ADMIN_ITEMS : [])];
}

export function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}
