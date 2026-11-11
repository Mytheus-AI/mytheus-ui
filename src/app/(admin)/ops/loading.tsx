import { SkeletonSection } from "@/components/ui/Page";
import { OpsTenantsSkeleton } from "@/components/admin/AdminSkeletons";

/* Tenants while they load, inside the ops layout (its title and tabs stay put). */
export default function Loading() {
  return (
    <SkeletonSection label="Loading tenants" className="flex flex-col gap-5">
      <OpsTenantsSkeleton />
    </SkeletonSection>
  );
}
