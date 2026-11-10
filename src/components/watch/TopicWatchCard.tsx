import { fetchTopicWatches } from "@/lib/api/topic-watches";
import type { TopicWatch } from "@/lib/api/personal-types";
import { PanelError } from "@/components/promises/parts";
import { TopicWatchEditor } from "./TopicWatchEditor";

/**
 * Topic watch, for the agent page (ADR-0039 A6, C7, Part E): the topics your agent listens for in
 * meetings you are not in. Add and remove them as chips, up to 20. Server component; it reads
 * `GET /api/v1/users/me/topic-watches` itself so the agent page only mounts it. A failed read
 * degrades this card alone.
 */
export async function TopicWatchCard({ className = "" }: { className?: string }) {
  let watches: TopicWatch[] | null = null;
  try {
    watches = await fetchTopicWatches();
  } catch {
    watches = null;
  }

  return (
    <section
      id="topic-watch"
      aria-labelledby="watch-h"
      className={`scroll-mt-4 rounded-card border border-line bg-surface p-5 shadow-warm-1 sm:p-6 ${className}`}
    >
      <h2 id="watch-h" className="display text-[22px] text-ink">
        Topics you watch
      </h2>
      <p className="mt-1.5 max-w-[68ch] text-[14.5px] leading-relaxed text-ink-3">
        When one of these comes up in a meeting you are not in, your agent tells you. It only covers meetings you are
        allowed to see, and never confidential ones.
      </p>
      {watches === null ? (
        <div className="-mx-5 mt-2 sm:-mx-6">
          <PanelError title="We could not load your topics" text="They are safe. Try again in a moment." />
        </div>
      ) : (
        <TopicWatchEditor initial={watches} />
      )}
    </section>
  );
}
