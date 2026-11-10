import { CardSkeleton } from "@/components/ui/Page";

/* Inside the My work layout (its title and tabs stay put): the tab's own skeleton, in the tab's shape. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading updates">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]"><CardSkeleton rows={4} /><CardSkeleton rows={3} /></div>
      <span className="sr-only">Loading updates</span>
    </div>
  );
}
