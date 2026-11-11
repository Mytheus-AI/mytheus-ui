import "@/components/room/room-polish.css";

/* While a call page loads (the meeting, the members, your session): the room's own state frame
   (the one the room's error and ended states use) with a quiet stage, so the screen does not flash
   blank. The frame is busy and says once, politely, what is loading; the pulse runs only when
   motion is allowed (room-polish.css). Pre-join and the room are too different to draw both, so
   this stays the neutral stage both open from. */

export default function CallLoading() {
  return (
    <div className="mx-meet cx-call call-state" aria-busy="true">
      <main className="call-state-main" id="page-call-loading">
        <div className="call-state-stage" aria-hidden="true">
          <span className="call-state-pulse" />
        </div>
        <p role="status" className="call-state-text">
          Loading the meeting
        </p>
      </main>
    </div>
  );
}
