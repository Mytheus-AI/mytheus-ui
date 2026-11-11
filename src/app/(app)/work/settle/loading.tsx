import { CardSkeleton } from "@/components/ui/Page";

/* Inside the My work layout (its title and tabs stay put): the list's own skeleton. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading decisions to settle">
      <CardSkeleton rows={3} />
      <span className="sr-only">Loading decisions to settle</span>
    </div>
  );
}
