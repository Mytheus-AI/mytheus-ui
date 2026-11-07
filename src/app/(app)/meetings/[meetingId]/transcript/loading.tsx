import "@/styles/meeting-transcript.css";

/* Skeleton for the transcript while the server reads it. Mirrors the final layout (screen head,
   a rail of panels, the transcript panel) so nothing jumps when the content arrives. */
export default function Loading() {
  return (
    <section className="page" role="status" aria-label="Loading transcript">
      <div className="page-inner tx-inner">
        <div className="screen-head">
          <div className="head-text">
            <div className="tx-skel" style={{ height: 30, width: 260, maxWidth: "100%" }} />
            <div className="tx-skel" style={{ height: 12, width: 300, maxWidth: "100%", marginTop: 8 }} />
          </div>
        </div>
        <div className="canvas cols-2r is-fill">
          <div className="rail-stack">
            {[110, 150].map((h) => (
              <div key={h} className="panel">
                <div className="panel-head">
                  <div className="tx-skel" style={{ height: 10, width: 80 }} />
                </div>
                <div className="panel-body">
                  <div className="tx-skel" style={{ height: h - 50 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="panel">
            <div className="panel-head">
              <div className="tx-skel" style={{ height: 10, width: 90 }} />
            </div>
            <div className="panel-body">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="tr-row" style={{ alignItems: "center" }}>
                  <div className="tx-skel" style={{ height: 10, width: 44, flexShrink: 0 }} />
                  <div className="tx-skel" style={{ height: 10, width: 70, flexShrink: 0 }} />
                  <div className="tx-skel" style={{ height: 12, flex: 1 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading transcript</span>
    </section>
  );
}
