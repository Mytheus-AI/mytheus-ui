"use client";

import { defaultDoodleSeed, doodleSvgString, isDoodleSeed } from "./doodle";

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

/** Rasterise a doodle to a square PNG. Clerk takes raster images, not SVG. */
export async function doodlePng(seed: string, size = 512): Promise<Blob> {
  const svg = doodleSvgString(seed, size);
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not draw the doodle."));
    img.src = url;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not draw the doodle.");
  ctx.drawImage(img, 0, 0, size, size);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not draw the doodle."))), "image/png"),
  );
}

/* `doodleImage` records which picture Clerk holds. For a while people wore plush characters and
   their uploaded picture was a plush (marked `plush1:<seed>`); before that it was the bare seed.
   The `doodle2:` mark means "this seed's ink doodle is the picture", so anyone whose stored
   picture is a plush (or older) gets their doodle uploaded once, on their next signed-in page.
   Plush characters are for agents only and never become a person's picture. */
const imageMark = (seed: string) => `doodle2:${seed}`;

/** Store the seed and upload the matching picture. `doodleImage` records which seed the
 *  uploaded picture shows, so a half-finished save is finished later rather than left stale. */
export async function saveDoodle(user: ClerkUserLike, seed: string): Promise<void> {
  if (!isDoodleSeed(seed)) throw new Error("That doodle could not be saved.");
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
