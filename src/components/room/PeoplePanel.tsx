"use client";

import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { CollapseSection } from "@/components/call/CollapseSection";

/* Who is in the call, as the design's "Participants" section. Rows come from the live LiveKit
   participants when connected, otherwise from the mock roster, so this is a projection of
   whatever the stage is showing. The design's invite and options buttons are left out (no invite
   flow exists in the app yet). */

export type RoomPerson = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
  speaking?: boolean;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PeoplePanel({ people, id }: { people: RoomPerson[]; id?: string }) {
  return (
    <div className="participants reveal" id={id} style={{ animationDelay: ".18s" }}>
      <CollapseSection title="Participants" countChip={<span className="count-chip">{people.length}</span>}>
        {people.length === 0 ? (
          <p className="saved-empty">No one is in the room yet.</p>
        ) : (
          <div className="p-list" role="list">
            {people.map((p) => (
              <div className="p-row" role="listitem" key={p.id}>
                <span className="p-av cx-av" aria-hidden>
                  {initials(p.name)}
                </span>
                <span className="p-id">
                  <strong>{p.isLocal ? `${p.name} (You)` : p.name}</strong>
                  {p.role ? <small>{p.role}</small> : null}
                </span>
                <span className="p-status">
                  {p.speaking && p.micOn ? (
                    <span className="st-speaking wave" role="img" aria-label="Speaking">
                      <i></i>
                      <i></i>
                      <i></i>
                      <i></i>
                    </span>
                  ) : p.micOn ? (
                    <Microphone size={14} role="img" aria-label="Mic on" />
                  ) : (
                    <MicrophoneSlash size={14} weight="fill" role="img" aria-label="Muted" />
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapseSection>
    </div>
  );
}
