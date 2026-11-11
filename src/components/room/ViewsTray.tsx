"use client";

import { useEffect, useMemo, useState } from "react";
import { ChatCircleText, Robot } from "@phosphor-icons/react";
import { decideMeetingView, loadMeetingViews } from "@/app/actions/listening";
import type { MeetingView } from "@/lib/api/listening-types";
import { mergeViews } from "@/lib/listening";

/* Views from people who are not here (In every meeting at once), for the host only. Someone whose
   agent listens to this meeting can send a short view, or let their agent hold the line with
   statements they saved beforehand. It reaches the host first: Share puts it in the meeting chat
   for everyone (and tells its author), Set aside keeps it out. Read on mount (a reload or a late
   join loses nothing) and live from the room's "meeting-view" event. */

export function ViewsTray({
  meetingId,
  live,
  onShare,
}: {
  meetingId: string;
  /** views that arrived over the room socket */
  live: MeetingView[];
  /** put text in the meeting chat (the room socket) */
  onShare: (text: string) => void;
}) {
  const [stored, setStored] = useState<MeetingView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadMeetingViews(meetingId).then((res) => {
      if (!cancelled && res.ok && res.data.is_host) setStored(res.data.items);
    });
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const views = useMemo(() => mergeViews(stored, live).filter((v) => v.status === "pending"), [stored, live]);
  if (views.length === 0 && !error) return null;

  const decide = async (v: MeetingView, verdict: "share" | "dismiss") => {
    setBusy(v.id);
    setError(null);
    const res = await decideMeetingView(meetingId, v.id, verdict);
    setBusy(null);
    if (!res.ok) return setError(res.message);
    if (verdict === "share" && res.data.status === "shared") onShare(res.data.chat_text);
    setStored((s) => mergeViews(s, [res.data]));
  };

  return (
    <div className="sb-standins" role="region" aria-label="Views from people who are not here">
      {error ? (
        <p role="alert" className="text-[13px] text-priority-high">
          {error}
        </p>
      ) : null}
      {views.map((v) => {
        const first = v.author_name.split(" ")[0] || v.author_name;
        const Icon = v.kind === "hold_line" ? Robot : ChatCircleText;
        return (
          <section key={v.id} className="sb-standin" aria-label={v.kind === "hold_line" ? `${first}'s agent is holding the line` : `${first}'s view`}>
            <div className="sb-standin-head">
              <Icon size={16} weight="fill" aria-hidden />
              <p>
                <strong>{v.kind === "hold_line" ? `${first}'s agent is holding the line` : `${first}'s view`}</strong>
              </p>
              <span className="sb-standin-who">Only you see this until you share it</span>
            </div>
            <ol className="sb-standin-qs">
              <li>
                <span className="sb-standin-q">{v.text}</span>
                <span className="flex gap-1.5">
                  <button type="button" className="sb-btn tap" disabled={busy === v.id} onClick={() => void decide(v, "dismiss")}>
                    Set aside
                  </button>
                  <button type="button" className="sb-btn is-primary tap" disabled={busy === v.id} onClick={() => void decide(v, "share")}>
                    <ChatCircleText size={14} aria-hidden />
                    Share with the room
                  </button>
                </span>
              </li>
            </ol>
          </section>
        );
      })}
    </div>
  );
}
