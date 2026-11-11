import "@/styles/meeting.css";

/**
 * Every Meetings screen inside the app shell renders under `.mx-meet`, the scope that
 * src/styles/meeting.css styles. That stylesheet reads the global tokens only (globals.css, with
 * the dark set in app-theme.css under `.mx-app[data-theme="dark"]`), so both themes come from the
 * shell and nothing here restyles the rest of the app.
 */
export default function MeetingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-meet">{children}</div>;
}
