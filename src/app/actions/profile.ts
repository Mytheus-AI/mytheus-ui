"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { api, ApiError } from "@/lib/api/client";
import { profileTag } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";
import {
  fieldFromDetail,
  fullNameFrom,
  normalizeProfile,
  validatePersona,
  validateProfile,
  type FieldErrors,
  type PersonaField,
  type PersonaInput,
  type ProfileField,
  type ProfileInput,
  type UserProfile,
  type UserProfileUpdate,
} from "@/lib/api/profile-types";

/**
 * Drop the caller's cached Clerk profile after they change it in the browser (a new doodle), so
 * the next render shows it instead of waiting out the five-minute cache. Only ever the caller's
 * own entry: the user id comes from the verified session, never from the request.
 */
export async function refreshMyProfile(): Promise<void> {
  const { userId } = await auth();
  if (userId) revalidateTag(profileTag(userId));
}

export type SaveResult<F extends string> =
  | { ok: true; profile: UserProfile }
  | { ok: false; message: string; fieldErrors?: FieldErrors<F> };

const PROFILE_FIELDS: readonly ProfileField[] = ["role", "bio", "skills", "listen_for", "ignore_topics"];
const PERSONA_FIELDS: readonly PersonaField[] = [
  "agent_name",
  "agent_avatar_seed",
  "agent_personality",
  "agent_instructions",
];

const FIELD_NAMES: Record<ProfileField | PersonaField, string> = {
  role: "role",
  bio: "what you work on",
  skills: "focus areas",
  listen_for: "listen for",
  ignore_topics: "ignore",
  agent_name: "name",
  agent_avatar_seed: "face",
  agent_personality: "personality",
  agent_instructions: "instructions",
};

/** PATCH the caller's own row. The id comes from `GET /users/me`, resolved server-side. */
async function patchMe<F extends ProfileField | PersonaField>(
  body: UserProfileUpdate,
  fields: readonly F[],
): Promise<SaveResult<F>> {
  const me = await fetchMyProfile();
  if (!me) return { ok: false, message: "Your profile could not be found just now. Try again in a moment." };
  try {
    const saved = await api<Partial<UserProfile> & { id: string }>(`/users/${me.id}`, { method: "PATCH", body });
    // Lists such as the dashboard prompt read the profile; drop the client router cache too.
    revalidatePath("/", "layout");
    return { ok: true, profile: normalizeProfile({ ...me, ...saved }) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 422) {
      const field = fieldFromDetail(err.message, fields);
      if (field) {
        const message = `Check ${FIELD_NAMES[field]}: it wasn't accepted.`;
        return { ok: false, message, fieldErrors: { [field]: message } as FieldErrors<F> };
      }
      return { ok: false, message: "Some details weren't accepted. Check them and try again." };
    }
    if (err instanceof ApiError && err.status === 403)
      return { ok: false, message: "Only you can change your own Myte and profile." };
    if (err instanceof ApiError && err.isAuthFailure)
      return { ok: false, message: "Your session ended. Sign in again, then save." };
    return { ok: false, message: "Your changes could not be saved just now. Try again in a moment." };
  }
}

/**
 * Save what the caller's agent knows about them (ADR-0038 D1). `onboarding` asks for a role and
 * at least 20 characters about their work; Settings saves without those, like the API.
 */
export async function saveWorkingProfile(
  input: ProfileInput,
  opts: { onboarding?: boolean } = {},
): Promise<SaveResult<ProfileField>> {
  const checked = validateProfile(input, opts);
  if (!checked.ok) return { ok: false, message: "A few details need a look.", fieldErrors: checked.errors };
  return patchMe(checked.value, PROFILE_FIELDS);
}

/**
 * Save the caller's agent persona (ADR-0038 D2). Blank name, face or instructions store NULL,
 * which the UI shows as the defaults. Self only: the API refuses anyone else with 403.
 */
export async function saveAgentPersona(input: PersonaInput): Promise<SaveResult<PersonaField>> {
  const checked = validatePersona(input);
  if (!checked.ok) return { ok: false, message: "A few details need a look.", fieldErrors: checked.errors };
  return patchMe(checked.value, PERSONA_FIELDS);
}

/**
 * Tell Mytheus the caller's real name after they change it in Clerk, so everything the backend
 * writes (briefings, "{first name}'s Myte", owner names) uses it instead of a name made from
 * the email. Self only; the API stores a blank name as NULL. Never throws: the Clerk save has
 * already happened, and the next app render's sync retries a name that did not land here.
 */
export async function saveDisplayName(name: string): Promise<boolean> {
  const display_name = fullNameFrom(name, null);
  const result = await patchMe({ display_name }, [] as const).catch(() => null);
  return !!result?.ok;
}
