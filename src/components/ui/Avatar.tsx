import { defaultDoodleSeed, isDoodleSeed, isPlaceholderImage } from "@/lib/doodle";
import { Doodle } from "./Doodle";

/* Every person in the product has a face, never a pair of initials.

   Order of preference:
   1. `seed`: the face the person chose (Clerk `unsafeMetadata.doodle`), drawn as their plush
      character (Doodle, a still from the shared renderer).
   2. `src`: their picture. Once someone has a face this is the same plush, uploaded to Clerk as
      a transparent PNG; otherwise an uploaded or Google photo.
   3. The default face for `id` (pass the person's email: it is the key every surface shares,
      so a teammate's view and the person's own sidebar draw the same face) or, failing that,
      `name`. Mock and sample data only carry names, so they get a consistent face per name.
   Clerk's generic placeholder picture counts as no picture. */

const sizeClass = {
  xs: "h-6 w-6",
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
  xl: "h-20 w-20",
};

export type AvatarSize = keyof typeof sizeClass;

export function Avatar({
  name,
  id,
  seed,
  src,
  size = "md",
  className = "",
  ring = false,
}: {
  name: string;
  id?: string;
  seed?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
  /** a surface-coloured ring, for avatars that overlap in a stack */
  ring?: boolean;
}) {
  const base = `inline-block shrink-0 overflow-hidden rounded-full bg-bg-2 align-middle ${sizeClass[size]} ${
    ring ? "ring-2 ring-surface" : ""
  } ${className}`;

  if (!isDoodleSeed(seed) && src && !isPlaceholderImage(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} title={name} className={`${base} object-cover`} loading="lazy" decoding="async" />
    );
  }

  const drawSeed = isDoodleSeed(seed) ? seed : defaultDoodleSeed(id || name);
  return (
    <span className={base} title={name}>
      <Doodle seed={drawSeed} title={name} className="block h-full w-full" />
    </span>
  );
}
