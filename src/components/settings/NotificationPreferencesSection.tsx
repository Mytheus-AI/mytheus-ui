import { fetchNotificationPreferences } from "@/lib/api/notifications";
import { mergePreferences } from "@/lib/notification-preferences";
import { NotificationPreferencesForm } from "./NotificationPreferencesForm";

/* The notification preferences section of user settings (Phase P11, plan 3.9). Server
   component: reads the caller's own rows from notification-service (`GET
   /notifications/preferences`) and hands plain data to the form. Unreachable or not deployed
   yet: the form opens on the defaults and says it could not load them, rather than failing the
   whole settings page. */
export async function NotificationPreferencesSection() {
  let initial = mergePreferences([]);
  let loaded = true;
  try {
    const body = await fetchNotificationPreferences();
    initial = mergePreferences(body?.items);
  } catch {
    loaded = false;
  }
  return <NotificationPreferencesForm initial={initial} loaded={loaded} />;
}
