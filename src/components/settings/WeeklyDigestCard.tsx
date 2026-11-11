import { fetchDigestPreferences } from "@/lib/api/digests";
import { fetchNotificationPreferences } from "@/lib/api/notifications";
import type { DigestPreferences } from "@/lib/api/only-mytheus-types";
import { WeeklyDigestForm } from "./WeeklyDigestForm";

/* The weekly digest preference (only-Mytheus wave, contract section 5). Server component: reads
   your digest settings and whether this server can send email at all (`email_configured` on
   `GET /notifications/preferences`), then hands plain data to the switches. Either read failing
   costs only its own part: the card opens on the defaults and says so. */

export async function WeeklyDigestCard() {
  const [prefs, notif] = await Promise.all([
    fetchDigestPreferences().then(
      (p): { ok: true; prefs: DigestPreferences } => ({
        ok: true,
        prefs: { weekly_enabled: p?.weekly_enabled !== false, email_enabled: p?.email_enabled === true },
      }),
      () => ({ ok: false as const }),
    ),
    fetchNotificationPreferences().then(
      (body) => (body as { email_configured?: unknown } | null)?.email_configured === true,
      () => null,
    ),
  ]);
  return (
    <WeeklyDigestForm
      initial={prefs.ok ? prefs.prefs : { weekly_enabled: true, email_enabled: false }}
      loaded={prefs.ok}
      emailConfigured={notif}
    />
  );
}
