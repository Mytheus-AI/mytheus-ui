import { redirect } from "next/navigation";

/** Your agent has its own page now (the sidebar's agent tab); old links land there. */
export default function AgentSettingsPage() {
  redirect("/agent");
}
