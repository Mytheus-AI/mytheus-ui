import { Bone, Page, PageHeadSkeleton } from "@/components/ui/Page";

/* The legacy Billing page while it checks your role: an admin is sent on to the Workspace console,
   a member sees the title row and one note at the reading width, which is what this draws. */
export default function Loading() {
  return (
    <Page width="read" label="Loading billing">
      <PageHeadSkeleton title="w-32" context={["w-[440px]"]} narrow={["w-[40%]"]} />
      <Bone className="h-[70px] w-full sm:h-12" />
    </Page>
  );
}
