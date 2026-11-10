import { fetchNotificationPreferences } from "@/lib/api/notifications";
import { emailDelivery, mergePreferences, type EmailDelivery } from "@/lib/notification-preferences";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";

/* The notification preferences section of user settings (Phase P11, plan 3.9). Server
   component: reads the caller's own rows from notification-service (`GET
   /notifications/preferences`) and hands plain data to the form. Unreachable or not deployed
   yet: the form opens on the defaults and says it could not load them, rather than failing the
   whole settings page. It also passes on whether this server can send email at all
   (`email_configured`), so the Email row can say "not connected yet" instead of promising mail. */
export async function NotificationPreferencesSection() {
  let initial = mergePreferences([]);
  let loaded = true;
  let email: EmailDelivery = "unknown";
  try {
    const body = await fetchNotificationPreferences();
    initial = mergePreferences(body?.items);
    email = emailDelivery(body);
  } catch {
    loaded = false;
  }
  return <NotificationPreferencesForm initial={initial} loaded={loaded} email={email} />;
}
