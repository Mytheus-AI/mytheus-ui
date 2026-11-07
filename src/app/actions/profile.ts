"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { profileTag } from "@/lib/api/org-context";

/**
 * Drop the caller's cached Clerk profile after they change it in the browser (a new doodle), so
 * the next render shows it instead of waiting out the five-minute cache. Only ever the caller's
 * own entry: the user id comes from the verified session, never from the request.
 */
export async function refreshMyProfile(): Promise<void> {
  const { userId } = await auth();
  if (userId) revalidateTag(profileTag(userId));
}
