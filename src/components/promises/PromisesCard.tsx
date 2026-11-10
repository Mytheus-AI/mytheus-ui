import { fetchMyPromises } from "@/lib/api/commitments";
import { newestOpen, type PromiseView } from "@/lib/api/personal-types";
import { PanelError, PanelHead, PanelLink, panelClass } from "./parts";
import { PromisesCardList } from "./PromisesCardList";

const SHOWN = 5;

/**
 * The dashboard's promises card (ADR-0039 Part E): the caller's newest open promises, up to five,
 * each marked done inline (optimistic, with Undo). Server component; it reads
 * `GET /api/v1/commitments?status=open` itself so the dashboard only mounts it. A failed read
 * degrades this card alone.
 */
export async function PromisesCard({ className = "" }: { className?: string }) {
  let items: PromiseView[] | null = null;
  try {
    items = await fetchMyPromises("open");
  } catch {
    items = null;
  }
  const shown = items ? newestOpen(items, SHOWN) : [];
  const total = items ? items.filter((p) => p.status === "open").length : 0;

  return (
    <section aria-labelledby="promises-card-h" className={`${panelClass} ${className}`}>
      <PanelHead
        id="promises-card-h"
        title="Your promises"
        caption="What you said you would do"
        right={items && total > 0 ? <span className="text-[13px] font-semibold text-ink-3">{total} open</span> : null}
      />
      {items === null ? (
        <PanelError title="We could not load your promises" text="They are safe. Try again in a moment." />
      ) : (
        <PromisesCardList initial={shown} nowIso={new Date().toISOString()} />
      )}
      {items !== null ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-line px-[18px] py-1.5 sm:px-[22px]">
          <PanelLink href="/promises">All promises</PanelLink>
          {total > shown.length ? <span className="text-[12.5px] text-ink-3">{total - shown.length} more open</span> : null}
        </div>
      ) : null}
    </section>
  );
}
