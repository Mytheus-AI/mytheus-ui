import { redirect } from "next/navigation";
import { appHref } from "@/lib/marketing/app-url";

/* Auth lives in the product app (`mytheus-web`), not here. This route only
   exists so old links and bookmarks pointing at /sign-in still land somewhere
   real - it hands off to the app's own entry, which owns the sign-in flow. */
export default function Page() {
  redirect(appHref());
}
