import { fetchTopicWatches } from "@/lib/api/topic-watches";
import type { TopicWatch } from "@/lib/api/personal-types";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
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
    <Card as="section" flush id="topic-watch" aria-labelledby="watch-h" className={`scroll-mt-4 ${className}`}>
      <CardHead
        id="watch-h"
        title="Topics you watch"
        description="When one of these comes up in a meeting you are not in, your agent tells you. It only covers meetings you are allowed to see, and never confidential ones."
      />
      {watches === null ? (
        <ErrorState variant="inline" title="We could not load your topics" text="They are safe. Try again in a moment." />
      ) : (
        <CardBody>
          <TopicWatchEditor initial={watches} />
        </CardBody>
      )}
    </Card>
  );
}
