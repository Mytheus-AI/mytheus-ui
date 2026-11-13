import { SkeletonSection } from "@/components/ui/Page";
import { OpsTenantsSkeleton } from "@/components/admin/AdminSkeletons";

/* The feedback inbox while it loads, inside the ops layout (its title and tabs stay put). */
export default function Loading() {
  return (
    <SkeletonSection label="Loading feedback" className="flex flex-col gap-5">
      <OpsTenantsSkeleton />
    </SkeletonSection>
  );
}
