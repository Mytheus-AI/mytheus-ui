import "@/components/room/room-polish.css";

/* While a call page loads (the meeting, the members, your session): the room's own frame with a
   quiet placeholder, so the screen does not flash blank or jump when the room arrives. */

export default function CallLoading() {
  return (
    <div className="mx-meet cx-call call-state" aria-busy="true">
      <main className="call-state-main" id="page-call-loading">
        <div className="call-state-stage" aria-hidden="true">
          <span className="call-state-pulse" />
        </div>
        <p role="status" className="call-state-text">
          Getting the meeting ready
        </p>
      </main>
    </div>
  );
}
