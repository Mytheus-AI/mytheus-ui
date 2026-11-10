import "@/styles/meeting-transcript.css";

/* Skeleton for the transcript while the server reads it. Mirrors the final layout (title row, the
   transcript card, the rail of cards) so nothing jumps when the content arrives. */
export default function Loading() {
  return (
    <div className="mx-page tx" role="status" aria-label="Loading transcript">
      <div className="tx-skel" style={{ height: 14, width: 130, marginBottom: 14 }} />
      <div className="mx-head" aria-hidden="true">
        <div className="mx-head-main">
          <div className="tx-skel" style={{ height: 34, width: 320, maxWidth: "100%" }} />
          <div className="tx-skel" style={{ height: 14, width: 360, maxWidth: "100%", marginTop: 12 }} />
        </div>
      </div>
      <div className="tx-layout" aria-hidden="true">
        <div className="mx-card tx-main">
          <div className="tx-bar">
            <div className="tx-skel" style={{ height: 44, flex: 1 }} />
          </div>
          <div className="tx-scroll-skel">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="tr-row">
                <div className="tx-skel" style={{ height: 12, width: 44 }} />
                <div className="tx-skel" style={{ height: 12, width: 110 }} />
                <div className="tx-skel" style={{ height: 14 }} />
              </div>
            ))}
          </div>
        </div>
        <div className="tx-rail">
          {[150, 190].map((h) => (
            <div key={h} className="mx-card mx-card-pad">
              <div className="tx-skel" style={{ height: 16, width: 110, marginBottom: 14 }} />
              <div className="tx-skel" style={{ height: h - 60 }} />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading transcript</span>
    </div>
  );
}
