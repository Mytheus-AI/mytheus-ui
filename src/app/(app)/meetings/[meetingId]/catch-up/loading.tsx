import "@/styles/meeting-hub.css";
import "@/styles/meeting-brain.css";

/* Skeleton for the catch-up while the server reads it. Mirrors the final layout (title row, the
   summary band, three columns of cards) so nothing jumps when the content arrives. */
export default function Loading() {
  return (
    <div className="mx-page md cu" role="status" aria-label="Loading the catch-up">
      <span className="mt-skel" style={{ height: 14, width: 150, marginBottom: 18 }} />
      <div className="mx-head" aria-hidden="true">
        <div className="mx-head-main">
          <span className="mt-skel" style={{ height: 26, width: 110, marginBottom: 12 }} />
          <span className="mt-skel" style={{ height: 34, width: 360, maxWidth: "100%" }} />
        </div>
      </div>
      <div className="mx-card cu-lead" aria-hidden="true">
        <span className="mt-skel" style={{ height: 22, flex: 1 }} />
      </div>
      <div className="cu-grid" aria-hidden="true">
        {[0, 1, 2].map((c) => (
          <div className="md-col" key={c}>
            {[150, 120].map((h) => (
              <div key={h} className="mx-card mx-card-pad">
                <span className="mt-skel" style={{ height: 16, width: 120, marginBottom: 16 }} />
                <span className="mt-skel" style={{ height: h - 60 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading the catch-up</span>
    </div>
  );
}
