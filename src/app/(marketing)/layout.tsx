import type { ReactNode } from "react";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Thread } from "@/components/site/Thread";
import "@/styles/app-theme.css";

/* Every marketing page shares this chrome: the floating nav, the page-long coral line, and the
   footer the line ends in. The root is `relative` and starts at the top of the document, which
   the Thread's absolute SVG depends on. Pages render only their own sections. `mx-site` opts the
   marketing site into the dark token set in src/styles/app-theme.css. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div id="top" className="mx-site relative min-h-screen overflow-x-clip bg-bg text-ink-2">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
      <Thread />
    </div>
  );
}
