import type { Icon } from "@phosphor-icons/react";
import {
  Brain,
  Briefcase,
  Buildings,
  ChartBar,
  CheckSquare,
  ChatCircleDots,
  Compass,
  Gauge,
  GearSix,
  Key,
  Handshake,
  House,
  Lifebuoy,
  Lock,
  PaintBrush,
  PlugsConnected,
  Scales,
  ShieldCheck,
  Smiley,
  Sparkle,
  Tray,
  UserCircle,
  Users,
  UsersThree,
  VideoCamera,
  Bell,
  Broadcast,
} from "@phosphor-icons/react/ssr";

/* The app's information architecture, in one place. One list feeds the sidebar, the topbar
   breadcrumb, the section tabs and the command palette, so a screen is added in exactly one place.

   Sidebar, top to bottom: your agent, then Home, Inbox (with its count), Meetings, Capture a call
   (the companion for Zoom, Meet and Teams calls, /capture, built on its own branch), My work,
   Decisions and People; then Admin (Workspace, admins only); then Settings (personal only). */

export type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  /** extra words the command palette matches ("org chart" finds People) */
  keywords?: string;
  /** shows the open count beside it */
  count?: "inbox";
};
export type NavSection = { label: string | null; items: NavItem[] };

/** Your agent has its own row at the top of the sidebar, drawn with its face. */
export const AGENT_ITEM: NavItem = { href: "/agent", label: "Your agent", icon: Smiley, keywords: "agent profile persona listen" };

export const MAIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: House, keywords: "dashboard today" },
  { href: "/inbox", label: "Inbox", icon: Tray, count: "inbox", keywords: "notifications alerts review status requests" },
  { href: "/meetings", label: "Meetings", icon: VideoCamera, keywords: "calendar calls" },
  { href: "/capture", label: "Capture a call", icon: Broadcast, keywords: "zoom meet teams chrome extension companion record" },
  { href: "/work", label: "My work", icon: Briefcase, keywords: "tasks promises updates status requests" },
  { href: "/decisions", label: "Decisions", icon: Scales, keywords: "decision log" },
  { href: "/people", label: "People", icon: Users, keywords: "org chart team directory" },
];

/** Shown to workspace owners and admins: the one Workspace console. */
export const ADMIN_ITEMS: NavItem[] = [
  { href: "/workspace", label: "Workspace", icon: UsersThree, keywords: "admin members brain billing usage data support" },
];

/** Personal settings, at the foot of the sidebar. */
export const FOOT_ITEMS: NavItem[] = [{ href: "/settings", label: "Settings", icon: GearSix, keywords: "profile preferences" }];

/* ---------------- section tabs ---------------- */

/** My work: everything you owe, in one view with three tabs. */
export const WORK_TABS: NavItem[] = [
  { href: "/work/tasks", label: "Tasks", icon: CheckSquare, keywords: "action items to do" },
  { href: "/work/promises", label: "Promises", icon: Handshake, keywords: "commitments" },
  { href: "/work/updates", label: "Updates I owe", icon: ChatCircleDots, keywords: "status requests" },
];

/** The Workspace console's tabs (admins). The company brain keeps its sections as a secondary nav
    inside its own tab. */
export const WORKSPACE_TABS: NavItem[] = [
  { href: "/workspace", label: "Overview", icon: Buildings, keywords: "workspace admin" },
  { href: "/workspace/members", label: "Members", icon: UsersThree, keywords: "invite people" },
  { href: "/workspace/brain", label: "Company brain", icon: Brain, keywords: "vocabulary goals owners ground rules" },
  { href: "/workspace/billing", label: "Usage and billing", icon: ChartBar, keywords: "plan budget invoices" },
  { href: "/workspace/agents", label: "Agent collaboration", icon: Handshake, keywords: "agents permissions" },
  { href: "/workspace/data", label: "Data and privacy", icon: Lock, keywords: "retention export erasure redaction" },
  { href: "/workspace/support", label: "Support access", icon: Lifebuoy, keywords: "support" },
];

/** Settings: personal only. */
export const SETTINGS_TABS: NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: UserCircle, keywords: "name role" },
  { href: "/settings/notifications", label: "Notifications", icon: Bell, keywords: "email alerts" },
  { href: "/settings/integrations", label: "Integrations", icon: PlugsConnected, keywords: "calendar slack jira hubspot notion confluence" },
  { href: "/settings/api", label: "API access", icon: Key, keywords: "personal access token mcp claude api curl" },
  { href: "/settings/appearance", label: "Appearance", icon: PaintBrush, keywords: "theme dark light shortcuts" },
];

/** Screens reached from cards and the palette rather than the sidebar. */
export const LINKED_ITEMS: NavItem[] = [
  { href: "/search", label: "Ask Mytheus", icon: Sparkle, keywords: "search question" },
  { href: "/welcome", label: "Welcome brief", icon: Compass, keywords: "new joiner" },
];

/* Platform-staff consoles (every tenant, ops). Not in the workspace nav: staff status is only
   known after `GET /admin/ops/whoami`, so they stay reachable by URL, behind that gate. */
export const PLATFORM_ITEMS: NavItem[] = [
  { href: "/admin", label: "Admin console", icon: ShieldCheck },
  { href: "/ops", label: "Ops console", icon: Gauge },
];

/** Where the primary "New meeting" control goes: the meetings hub, asked to open its form. */
export const NEW_MEETING_HREF = "/meetings?new=1";
/** The New task dialog on My work. */
export const NEW_TASK_HREF = "/work/tasks?new=1";

export const NAV_SECTIONS: NavSection[] = [{ label: null, items: MAIN_ITEMS }];

/** Every screen a signed-in person can jump to, for the palette. Admin-only screens only for admins,
    so a member is never handed a link that 404s. */
export function allNavItems(isAdmin: boolean): NavItem[] {
  return [
    AGENT_ITEM,
    ...MAIN_ITEMS,
    ...WORK_TABS,
    ...LINKED_ITEMS,
    ...FOOT_ITEMS,
    ...SETTINGS_TABS,
    ...(isAdmin ? [...ADMIN_ITEMS, ...WORKSPACE_TABS.filter((t) => t.href !== "/workspace")] : []),
  ];
}

export function isActive(pathname: string | null, href: string): boolean {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

/** The sidebar row that owns a path: the deepest matching href wins. */
export function currentNavHref(pathname: string | null, items: NavItem[]): string | null {
  return items.filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
