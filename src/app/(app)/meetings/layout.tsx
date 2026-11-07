import { fraunces } from "@/lib/fonts";
import "@/styles/meeting.css";
import "@/styles/meeting-dark.css";

/**
 * The Meeting tab's look: every Meetings screen inside the app shell renders in the meeting
 * design (src/styles/meeting.css, scoped to `.mx-meet`, generated from the non/ design). The
 * scope stops at this subtree, so no other screen is affected.
 */
export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`mx-meet ${fraunces.variable}`}>{children}</div>;
}
