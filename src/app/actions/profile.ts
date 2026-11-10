"use server";

import { revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { api, ApiError } from "@/lib/api/client";
import { profileTag } from "@/lib/api/org-context";
import { myUserId, type AgentProfile } from "@/lib/api/profile";

/**
 * Drop the caller's cached Clerk profile after they change it in the browser (a new doodle), so
 * the next render shows it instead of waiting out the five-minute cache. Only ever the caller's
 * own entry: the user id comes from the verified session, never from the request.
 */
export async function refreshMyProfile(): Promise<void> {
  const { userId } = await auth();
  if (userId) revalidateTag(profileTag(userId));
}

export type SaveProfileResult = { ok: true; profile: AgentProfile } | { ok: false; message: string };

/**
 * Save the caller's role and focus areas to `users` (`PATCH /users/{id}` on
 * `identity-tenant-service`, which also drops the cached `get_user_context()` entry so agents
 * see the change). The user id is resolved server-side from the session.
 */
export async function saveAgentProfile(input: { role: string; focus: string }): Promise<SaveProfileResult> {
  const role = input.role.trim();
  const skills = Array.from(
    new Set(
      input.focus
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
  if (role.length > 200) return { ok: false, message: "Keep the role under 200 characters." };
  if (skills.some((s) => s.length > 100)) return { ok: false, message: "Keep each focus area under 100 characters." };
  if (skills.length > 30) return { ok: false, message: "Keep it to 30 focus areas or fewer." };
  const id = await myUserId();
  if (!id) return { ok: false, message: "Your profile could not be found just now. Try again in a moment." };
  try {
    const saved = await api<{ role: string | null; skills: string[] }>(`/users/${id}`, {
      method: "PATCH",
      body: { role: role || null, skills },
    });
    return { ok: true, profile: { role: saved.role ?? "", skills: saved.skills } };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) return { ok: false, message: "Some details weren't accepted. Check them and try again." };
    return { ok: false, message: "Your profile could not be saved just now. Try again in a moment." };
  }
}
