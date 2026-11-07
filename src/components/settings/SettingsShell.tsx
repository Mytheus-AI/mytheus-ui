import type { ReactNode } from "react";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { PageHeader } from "./primitives";

/* Frame for every settings screen: the page header, the section nav and one panel heading.
   Server component; only the nav is a client island (it reads the pathname). */
export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <PageHeader
        title="Settings"
        description="Your profile, your workspace, and the connections your agents rely on."
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SettingsTabs />
        <div className="min-w-0">
          <div className="mb-5">
            <h2 className="display text-[26px] text-ink-display sm:text-[28px]">{title}</h2>
            {description ? (
              <p className="mt-1 max-w-[62ch] text-[14px] text-ink-3">{description}</p>
            ) : null}
          </div>
          <div className="grid gap-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
