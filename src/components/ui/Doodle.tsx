import { Plush } from "@/components/plush/Plush";

/* A person's or an agent's face, drawn from its seed.

   The name is historical: this used to draw an ink doodle. It now shows the seed's plush felt
   character (lib/plush.ts) as a still from the shared renderer, through the same props, so every
   caller kept working unchanged: `<Doodle seed className />`, with `title` for an accessible name
   (omit it for a decorative face). Server components can render it; the picture arrives on the
   client and a soft circle in the character's colour holds the box until then. */

export function Doodle({
  seed,
  className = "",
  title,
}: {
  seed: string;
  className?: string;
  /** accessible name; omit for a decorative face */
  title?: string;
  /** kept for callers of the old ink doodle, which drew its strokes in; a plush just appears */
  draw?: boolean;
}) {
  return <Plush seed={seed} title={title} className={className} />;
}
