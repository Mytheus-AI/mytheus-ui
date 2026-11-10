import { CardSkeleton } from "@/components/ui/Page";

/* Inside the Settings layout (its title and tabs stay put): the tab's own skeleton, in the tab's shape. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading settings">
      <div className="flex flex-col gap-5"><CardSkeleton rows={3} /><CardSkeleton rows={2} /></div>
      <span className="sr-only">Loading settings</span>
    </div>
  );
}
