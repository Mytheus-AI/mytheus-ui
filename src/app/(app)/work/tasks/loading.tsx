import { CardSkeleton } from "@/components/ui/Page";

/* Inside the My work layout (its title and tabs stay put): the tab's own skeleton, in the tab's shape. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading tasks">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2"><CardSkeleton rows={4} /><CardSkeleton rows={3} /></div>
      <span className="sr-only">Loading tasks</span>
    </div>
  );
}
