"use client";

import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";

/* Who is in the call. Rows come from the live LiveKit participants when connected, otherwise from
   the mock roster, so this is a projection of whatever the stage is showing. */

export type RoomPerson = {
  id: string;
  name: string;
  role?: string;
  isLocal?: boolean;
  micOn: boolean;
};

export function PeoplePanel({ people }: { people: RoomPerson[] }) {
  return (
    <div className="h-full overflow-y-auto px-3.5 pb-4">
      <h3 className="mb-1 mt-3.5 text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
        In the call ({people.length})
      </h3>
      {people.length === 0 ? (
        <p className="py-4 text-[13px] text-ink-3">No one is in the room yet.</p>
      ) : (
        <ul>
          {people.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0"
            >
              <Avatar name={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
                  <span className="truncate">{p.name}</span>
                  {p.isLocal ? (
                    <span className="shrink-0 rounded-full bg-bg-2 px-2 py-0.5 text-[11.5px] font-semibold text-ink-2">
                      You
                    </span>
                  ) : null}
                </p>
                {p.role ? <p className="truncate text-[12.5px] text-ink-3">{p.role}</p> : null}
              </div>
              {p.micOn ? (
                <Microphone size={18} className="shrink-0 text-ink-3" aria-label="Mic on" role="img" />
              ) : (
                <MicrophoneSlash
                  size={18}
                  weight="fill"
                  className="shrink-0 text-priority-high"
                  aria-label="Muted"
                  role="img"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
