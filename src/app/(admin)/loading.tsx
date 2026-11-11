import { Page, PageHeadSkeleton, TabsSkeleton } from "@/components/ui/Page";
import { OpsTenantsSkeleton } from "@/components/admin/AdminSkeletons";

/* The admin console while the ops gate and its first tab load: the ops console's own frame (title
   row and section tabs, OpsTabs' real labels) over the Tenants tab, where /admin and /ops land. */
export default function Loading() {
  return (
    <Page label="Loading the ops console">
      <PageHeadSkeleton title="w-48" context={["w-[560px]"]} narrow={["w-[60%]"]} />
      <TabsSkeleton labels={["Tenants", "Feature flags", "Cost and lag", "Audit log"]} />
      <div className="flex flex-col gap-5">
        <OpsTenantsSkeleton />
      </div>
    </Page>
  );
}
