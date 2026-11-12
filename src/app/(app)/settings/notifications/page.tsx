import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";
import { PromiseNudgesCard } from "@/components/settings/PromiseNudgesCard";
import { WeeklyDigestCard } from "@/components/settings/WeeklyDigestCard";

export const metadata: Metadata = { title: "Notifications | Mytheus" };

/* Settings > Notifications: how your Myte's alerts reach you, in the meeting, by email, and in
   Slack once the workspace connects it; the weekly digest; and promise nudges. */
export default function NotificationSettingsPage() {
  return (
    <>
      <SectionBar title="Notifications" context="Which alerts from your Myte reach you, and where. Everything still lands in your Inbox." />
      <div className="grid gap-5">
        <NotificationPreferencesSection />
        <WeeklyDigestCard />
        <PromiseNudgesCard />
      </div>
    </>
  );
}
