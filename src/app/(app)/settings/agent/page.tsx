import type { Metadata } from "next";
import { SettingsShell } from "@/components/settings/SettingsShell";
import { AgentPanel } from "@/components/settings/AgentPanel";
import { fetchMyProfile } from "@/lib/api/profile";

export const metadata: Metadata = { title: "Your agent | Mytheus" };

/** The caller's agent persona (ADR-0038 D2, D11), read from `GET /users/me`. Loading and errors
    fall to the settings segment's `loading.tsx` and `error.tsx`. */
export default async function AgentSettingsPage() {
  const profile = await fetchMyProfile();
  return (
    <SettingsShell
      title="Your agent"
      description="Its name, its face and how it writes your notes. Only you can change these."
    >
      <AgentPanel profile={profile} />
    </SettingsShell>
  );
}
