import type { Metadata } from "next";
import Link from "next/link";
import { OrgProvider } from "@/lib/org-context";
import { mockOrgContext } from "@/lib/mock/data";
import { Badge } from "@/components/ui/Badge";
import { LogoMark } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Mytheus — Admin",
};

/* RBAC gate is UX courtesy only per CLAUDE.md; real enforcement is
   server-side. Auth isn't wired up yet, so there's no gate at all right now
   — anyone can reach /admin. Add the Clerk role check here once auth lands. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider value={mockOrgContext}>
      <div className="min-h-dvh bg-bg">
        <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-8">
          <div className="flex items-center gap-3">
            <LogoMark size={22} />
            <span className="text-[18px] font-medium tracking-[-0.05em] text-ink">Mytheus</span>
            <Badge tone="warning">Admin console</Badge>
          </div>
          <Link
            href="/dashboard"
            className="text-[13px] font-medium text-ink-3 transition-colors hover:text-ink-2"
          >
            Back to app
          </Link>
        </header>
        <main className="px-8 py-8">{children}</main>
      </div>
    </OrgProvider>
  );
}
