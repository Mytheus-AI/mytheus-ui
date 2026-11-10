import { redirect } from "next/navigation";

/* The platform tenant overview moved into the internal-ops console (Phase P12): its tenant
   directory at /ops is the one list of every workspace, behind the staff gate. */
export default function AdminOverviewPage() {
  redirect("/ops");
}
