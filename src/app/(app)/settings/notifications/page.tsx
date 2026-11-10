import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { NotificationPreferencesSection } from "@/components/settings/NotificationPreferencesSection";

export const metadata: Metadata = { title: "Notifications | Mytheus" };

/* Settings > Notifications: how your agent's alerts reach you, in the meeting, by email, and in
   Slack once the workspace connects it. */
export default function NotificationSettingsPage() {
  return (
    <>
      <SectionBar title="Notifications" context="Which alerts from your agent reach you, and where. Everything still lands in your Inbox." />
      <div className="grid gap-5">
        <NotificationPreferencesSection />
      </div>
    </>
  );
}
