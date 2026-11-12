import { CheckCircle, CircleDashed } from "@phosphor-icons/react/ssr";
import { erasureProgress, orderedStores, storeLabel, type ErasureStoreRow } from "@/lib/erasure";
import { zonedFormat } from "@/lib/timezone-server";

/* One erasure's per-store checklist (Workspace > Data and privacy). core-api's records finish with
   the request; transcripts, the AI search index, keyword search and the knowledge graph each
   report back when their service has run, so they read "Waiting" until then. The state is in the
   words and the icon shape (a filled check, a dashed ring), never in colour alone. */

const time = () => zonedFormat({ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const at = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? time().format(new Date(iso)) : null);

export function ErasureStores({ id, progress: state, stores }: { id: string; progress?: string; stores?: ErasureStoreRow[] }) {
  const rows = orderedStores(stores);
  const progress = erasureProgress({ progress: state, stores });
  if (rows.length === 0) return null;
  return (
    <div>
      <p id={`${id}-progress`} className={`text-[13px] font-semibold ${progress.finished ? "text-ok" : "text-ink-2"}`}>
        {progress.label}
      </p>
      <ul aria-labelledby={`${id}-progress`} className="mt-1.5 grid gap-1">
        {rows.map((s) => {
          const label = storeLabel(s.store);
          const done = s.status === "completed";
          const when = at(s.completed_at);
          return (
            <li key={s.store} className="flex items-start gap-2 text-[13.5px] leading-snug">
              {done ? (
                <CheckCircle size={16} weight="fill" className="mt-px shrink-0 text-ok" aria-hidden />
              ) : (
                <CircleDashed size={16} className="mt-px shrink-0 text-ink-3" aria-hidden />
              )}
              <span className="min-w-0">
                <span className={done ? "text-ink-2" : "text-ink"}>{label.name}</span>
                <span className="text-ink-3">{done ? (when ? `, done ${when}` : ", done") : ", waiting"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
