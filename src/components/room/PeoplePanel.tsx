"use client";

import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";

/* Who is in the call, the People tab of the room's panel. Rows come from the live LiveKit
   participants when connected, otherwise just you, so this is a projection of whatever the stage
   is showing. Each person keeps the tint they have on their tile. No invite flow exists in the
   room yet, so there is no invite button. */

export type RoomPerson = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
  speaking?: boolean;
};

export function PeoplePanel({ people, id }: { people: RoomPerson[]; id?: string }) {
  return (
    <div className="ppl" id={id}>
      <div className="side-sec">
        <h3>In the call</h3>
        <span className="mx-count">{people.length}</span>
      </div>
      {people.length === 0 ? (
        <p className="saved-empty">No one is in the room yet.</p>
      ) : (
        <ul className="ppl-list">
          {people.map((p) => (
            <li className="ppl-row" key={p.id}>
              <span className={`mx-av ${toneOf(p.id)}`} aria-hidden>
                {initials(p.name)}
              </span>
              <span className="ppl-name">
                <strong>{p.name}</strong>
                {p.isLocal || p.role ? <small>{p.isLocal ? "You" : p.role}</small> : null}
              </span>
              {p.speaking && p.micOn ? (
                <span className="ppl-state wave" role="img" aria-label="Speaking">
                  <i></i>
                  <i></i>
                  <i></i>
                  <i></i>
                </span>
              ) : p.micOn ? (
                <span className="ppl-state">
                  <Microphone size={18} role="img" aria-label="Mic on" />
                </span>
              ) : (
                <span className="ppl-state is-muted">
                  <MicrophoneSlash size={18} weight="fill" role="img" aria-label="Muted" />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
