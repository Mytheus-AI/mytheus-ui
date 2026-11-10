import type { ReactNode } from "react";
import { SettingsTabs } from "@/components/app/SettingsTabs";
import { PageHeader } from "./primitives";

/* Frame for every settings screen: the serif page title, the section nav and one panel heading.
   Server component; only the nav is a client island (it reads the pathname). Headings run h1
   (Settings), h2 (the panel), h3 (each card). */
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
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Settings"
        description="Your profile, your workspace, and the connections your agents rely on."
      />
      <div className="mt-7 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <SettingsTabs />
        <div className="min-w-0">
          <div className="mb-5">
            <h2 className="display text-[24px] text-ink-display sm:text-[28px]">{title}</h2>
            {description ? (
              <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-3">{description}</p>
            ) : null}
          </div>
          <div className="grid gap-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
