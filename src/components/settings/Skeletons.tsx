import type { ReactNode } from "react";

/* Loading placeholders for the settings, billing, org, workspace admin and platform screens.
   Neutral blocks in each page's own layout, so nothing jumps when the content lands; they pulse
   only when motion is allowed. Server components, no data. */

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded-full bg-bg-2 ${className}`} />;
}

function Header() {
  return (
    <div>
      <Bar className="h-8 w-56 max-w-full sm:h-9" />
      <Bar className="mt-3 h-4 w-96 max-w-full" />
    </div>
  );
}

function RowCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface">
      <div className="px-4 pb-4 pt-[18px] sm:px-[22px]">
        <Bar className="h-4 w-40" />
        <Bar className="mt-2.5 h-3 w-64 max-w-full" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid gap-3 border-t border-line px-4 py-[18px] sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8"
        >
          <div>
            <Bar className="h-3.5 w-32" />
            <Bar className="mt-2 h-3 w-52 max-w-full" />
          </div>
          <div className="h-11 rounded-ctl bg-bg-2" />
        </div>
      ))}
    </div>
  );
}

function Shell({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="status" aria-label={label} className="motion-safe:animate-pulse">
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Settings and Billing: page title, the section nav, a panel title and two cards. */
export function SettingsSkeleton() {
  return (
    <Shell label="Loading settings">
      <div className="mx-auto max-w-6xl">
        <Header />
        <div className="mt-7 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="flex gap-1.5 overflow-hidden lg:flex-col">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 shrink-0 rounded-ctl bg-bg-2 lg:h-11 lg:w-full" />
            ))}
          </div>
          <div className="grid min-w-0 gap-5">
            <div>
              <Bar className="h-7 w-40" />
              <Bar className="mt-2.5 h-3.5 w-80 max-w-full" />
            </div>
            <RowCard rows={2} />
            <RowCard rows={3} />
          </div>
        </div>
      </div>
    </Shell>
  );
}

/** Workspace admin pages: title, a row of figures, then a table card. */
export function AdminSkeleton() {
  return (
    <Shell label="Loading workspace admin">
      <div className="flex flex-col gap-6">
        <Header />
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[106px] rounded-card border border-line bg-surface" />
          ))}
        </div>
        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="px-4 pb-4 pt-[18px] sm:px-[22px]">
            <Bar className="h-4 w-32" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 border-t border-line px-4 py-3.5 sm:px-[22px]">
              <div className="h-9 w-9 shrink-0 rounded-full bg-bg-2" />
              <div className="min-w-0 flex-1">
                <Bar className="h-3.5 w-36" />
                <Bar className="mt-2 h-3 w-48 max-w-full" />
              </div>
              <Bar className="hidden h-6 w-16 sm:block" />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

/** Org chart and the platform consoles: title, then a grid of cards. */
export function CardsSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <Shell label={label}>
      <div className="mx-auto max-w-6xl">
        <Header />
        <Bar className="mt-10 h-6 w-44" />
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="overflow-hidden rounded-card border border-line bg-surface">
              <div className="px-4 py-4 sm:px-[22px]">
                <Bar className="h-4 w-28" />
              </div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 border-t border-line px-4 py-3 sm:px-[22px]">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-bg-2" />
                  <div className="min-w-0 flex-1">
                    <Bar className="h-3.5 w-32" />
                    <Bar className="mt-2 h-3 w-44 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
