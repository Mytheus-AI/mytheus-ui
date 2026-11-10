import { CardSkeleton } from "@/components/ui/Page";

/* Inside the Workspace layout (its title and tabs stay put): the tab's own skeleton, in the tab's shape. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading the workspace">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2"><CardSkeleton rows={3} /><CardSkeleton rows={3} /><CardSkeleton rows={2} className="md:col-span-2" /></div>
      <span className="sr-only">Loading the workspace</span>
    </div>
  );
}
