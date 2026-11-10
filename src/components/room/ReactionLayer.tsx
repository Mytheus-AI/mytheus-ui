"use client";

import { reactionOf, type FloatingReaction } from "@/lib/realtime/room-live";
import { useRoomName } from "@/lib/realtime/room-names";

/* Reactions floating up the left edge of the stage for a few seconds, each with the sender's first
   name. With reduced motion they fade in place instead of rising. The newest one is announced
   politely to screen readers ("Raj: Applause"). */

export function ReactionLayer({ reactions, meId }: { reactions: FloatingReaction[]; meId: string | null }) {
  const nameOf = useRoomName();
  const latest = reactions[reactions.length - 1];
  const who = (id: string) => (id === meId ? "You" : nameOf(id, "Someone").split(" ")[0]);
  return (
    <>
      <div className="react-layer" aria-hidden>
        {reactions.map((r, i) => {
          const def = reactionOf(r.reaction);
          if (!def) return null;
          return (
            <span className="react-float" key={r.id} style={{ ["--i" as string]: i % 4 }}>
              <span className="react-emoji">{def.emoji}</span>
              <span className="react-who">{who(r.userId)}</span>
            </span>
          );
        })}
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {latest ? `${who(latest.userId)}: ${reactionOf(latest.reaction)?.label ?? ""}` : ""}
      </span>
    </>
  );
}
