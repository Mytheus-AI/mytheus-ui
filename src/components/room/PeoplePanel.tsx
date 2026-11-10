"use client";

import { Crown, HandPalm, Microphone, MicrophoneSlash, Robot } from "@phosphor-icons/react";
import { initials, toneOf } from "@/components/room/tone";
import { Doodle } from "@/components/ui/Doodle";
import type { PeopleGroups } from "@/lib/realtime/room-live";

/* Who is here, the People tab of the room's panel (polish program, Phase 0): three groups.

   - In the call: the live participants (or just you before the call connects). Raised hands come
     first, in the order they went up, with their place in the queue; then you; then everyone else.
   - Agents: people who sent their agent instead of coming (ADR-0039 B5), shown as their agent.
   - Invited, not here: everyone else on the participant list, so the host can see who is missing.

   Each person keeps the tint they have on their tile. */

export type RoomPerson = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
  speaking?: boolean;
};

export function PeoplePanel({
  groups,
  id,
  agentSeedOf,
}: {
  groups: PeopleGroups;
  id?: string;
  agentSeedOf: (userId: string) => string;
}) {
  const handOrder = groups.inCall.filter((p) => p.handAt).map((p) => p.id);
  return (
    <div className="ppl" id={id}>
      <div className="side-sec">
        <h3 id="ppl-in-h">In the call</h3>
        <span className="mx-count">{groups.inCall.length}</span>
        {handOrder.length > 0 ? (
          <span className="side-sec-end">
            <span className="mx-chip is-medium">
              <HandPalm size={14} weight="fill" aria-hidden />
              {handOrder.length} {handOrder.length === 1 ? "hand" : "hands"} up
            </span>
          </span>
        ) : null}
      </div>
      {groups.inCall.length === 0 ? (
        <p className="saved-empty">No one is in the call yet.</p>
      ) : (
        <ul className="ppl-list" aria-labelledby="ppl-in-h">
          {groups.inCall.map((p) => {
            const place = p.handAt ? handOrder.indexOf(p.id) + 1 : 0;
            return (
              <li className={`ppl-row${p.handAt ? " has-hand" : ""}`} key={p.id}>
                <span className={`mx-av ${toneOf(p.id)}`} aria-hidden>
                  {initials(p.name)}
                </span>
                <span className="ppl-name">
                  <strong>{p.name}</strong>
                  <small>
                    {[p.isLocal ? "You" : null, p.host ? "Host" : null].filter(Boolean).join(", ") || null}
                  </small>
                </span>
                {p.handAt ? (
                  <span className="ppl-hand" role="img" aria-label={`Hand raised, number ${place} in line`}>
                    <HandPalm size={16} weight="fill" aria-hidden />
                    {place}
                  </span>
                ) : null}
                {p.host ? <Crown size={15} weight="fill" className="ppl-host" aria-hidden /> : null}
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
            );
          })}
        </ul>
      )}

      {groups.agents.length > 0 ? (
        <>
          <div className="side-sec">
            <h3 id="ppl-ag-h">Agents attending</h3>
            <span className="mx-count">{groups.agents.length}</span>
          </div>
          <ul className="ppl-list" aria-labelledby="ppl-ag-h">
            {groups.agents.map((a) => (
              <li className="ppl-row is-agent" key={a.id}>
                <span className="mx-av is-agent" aria-hidden>
                  <Doodle seed={agentSeedOf(a.id)} className="block h-full w-full" />
                </span>
                <span className="ppl-name">
                  <strong>{a.agentName}</strong>
                  <small>Attending for {a.name}</small>
                </span>
                <span className="ppl-state" role="img" aria-label="Agent">
                  <Robot size={18} aria-hidden />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {groups.absent.length > 0 ? (
        <>
          <div className="side-sec">
            <h3 id="ppl-abs-h">Invited, not here</h3>
            <span className="mx-count">{groups.absent.length}</span>
          </div>
          <ul className="ppl-list is-absent" aria-labelledby="ppl-abs-h">
            {groups.absent.map((p) => (
              <li className="ppl-row is-absent" key={p.id}>
                <span className={`mx-av ${toneOf(p.id)}`} aria-hidden>
                  {initials(p.name)}
                </span>
                <span className="ppl-name">
                  <strong>{p.name}</strong>
                  <small>{p.host ? "Host, not joined yet" : "Not joined yet"}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
