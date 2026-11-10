import type { ReactNode } from "react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Thread } from "@/components/site/Thread";

/* Every marketing page shares this chrome: the floating nav, the page-long coral line, and the
   footer the line ends in. The root is `relative` and starts at the top of the document, which
   the Thread's absolute SVG depends on. Pages render only their own sections. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div id="top" className="relative min-h-screen bg-bg text-ink-2">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
      <Thread />
    </div>
  );
}
