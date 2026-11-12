"use client";

import { plushStillBlob } from "@/components/plush/stills";
import { defaultDoodleSeed, isDoodleSeed } from "./doodle";
import { PLUSH_VERSION } from "./plush";

/* Saving a doodle, browser side.

   The seed goes to Clerk `unsafeMetadata.doodle` (user-writable by design, and holding nothing
   sensitive: it is the name of a drawing). The rendered PNG becomes the Clerk profile image, and
   the `user.updated` webhook `identity-tenant-service` already handles copies that image URL into
   `users.avatar_url`. So the picture reaches the database without this repo owning any data and
   without a new backend route: every other surface that reads `avatar_url` (the people profile,
   anything the `bff` returns) shows the same doodle. */

/** The minimal slice of Clerk's `UserResource` this needs, so callers can pass `useUser().user`. */
type ClerkUserLike = {
  unsafeMetadata: Record<string, unknown>;
  update: (params: { unsafeMetadata: Record<string, unknown> }) => Promise<unknown>;
  setProfileImage: (params: { file: Blob }) => Promise<unknown>;
};

/** The face as a square PNG (Clerk takes raster images): the seed's plush character, on a
 *  transparent background like every other still. Rejects when this browser cannot draw it. */
export function doodlePng(seed: string, size = 512): Promise<Blob> {
  return plushStillBlob(seed, size);
}

/* `doodleImage` records which picture Clerk holds. Before the plush characters it was the bare
   seed (and the picture was an ink doodle); the prefix marks a plush upload, so an account whose
   stored picture is still the old drawing gets its plush uploaded once, the next time it signs in. */
const imageMark = (seed: string) => `plush${PLUSH_VERSION}:${seed}`;

/** Store the seed and upload the matching picture. `doodleImage` records which seed the
 *  uploaded picture shows, so a half-finished save is finished later rather than left stale. */
export async function saveDoodle(user: ClerkUserLike, seed: string): Promise<void> {
  if (!isDoodleSeed(seed)) throw new Error("That face could not be saved.");
  // Draw first: a browser that cannot draw the picture must not store a seed without one.
  const file = await doodlePng(seed);
  await user.update({ unsafeMetadata: { ...user.unsafeMetadata, doodle: seed } });
  await user.setProfileImage({ file });
  await user.update({ unsafeMetadata: { ...user.unsafeMetadata, doodle: seed, doodleImage: imageMark(seed) } });
}

/**
 * The doodle an account should carry, when its picture still needs uploading:
 * - a seed chosen at sign-up whose picture never uploaded: finish it;
 * - an account from before doodles existed (no seed at all): give it the default doodle for its
 *   email, the face the app has already been drawing for it.
 * `null` when there is nothing to do.
 */
export function pendingDoodle(meta: Record<string, unknown> | null | undefined, email: string): string | null {
  const seed = meta?.doodle;
  if (isDoodleSeed(seed)) return meta?.doodleImage === imageMark(seed) ? null : seed;
  return defaultDoodleSeed(email);
}
