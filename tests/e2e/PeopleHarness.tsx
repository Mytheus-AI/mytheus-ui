import { LockSimple } from "@phosphor-icons/react";
import { Shell } from "./skeletons/Shell";
import { Toaster } from "../../src/components/ui/Toaster";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { Page, PageHead } from "../../src/components/ui/Page";
import { NewDepartmentButton, NewTeamButton } from "../../src/components/org/OrgAdmin";
import { PeopleBoard } from "../../src/components/org/PeopleBoard";
import PeopleLoading from "../../src/app/(app)/people/loading";
import { CHART, CONTEXT, MEMBER_OPTIONS, PICK_DEPARTMENTS } from "./people-fixture";

/* People as `app/(app)/people/page.tsx` renders it, in the app shell, for every state: the board
   for an admin, the same board read-only for a member, empty, a failed read (Retry) and loading.
   Server reads are replaced by the sample org (people-fixture.ts); the server actions by
   stubs/actions.ts, which answer as core-api would on success. */

export type PeopleState = "admin" | "member" | "empty" | "error" | "loading";

const PICK_PEOPLE = MEMBER_OPTIONS.map((m) => ({ id: m.id, name: m.name, email: m.email }));

export function PeopleHarness({ theme = "light", state = "admin" }: { theme?: "light" | "dark"; state?: PeopleState }) {
  const admin = state !== "member";
  const actions = admin ? (
    <>
      <NewDepartmentButton departments={PICK_DEPARTMENTS} />
      <NewTeamButton departments={PICK_DEPARTMENTS} people={PICK_PEOPLE} />
    </>
  ) : undefined;
  let body;
  if (state === "loading") body = <PeopleLoading />;
  else if (state === "error")
    body = (
      <Page>
        <PageHead title="People" context="The departments and teams in Acme, and the people on them." />
        <ErrorState title="People could not be loaded" text="Something went wrong reaching the workspace. Nothing was lost." />
      </Page>
    );
  else if (state === "empty")
    body = (
      <Page>
        <PageHead title="People" context="Departments, teams and the people on them in Acme." action={actions} />
        <EmptyState
          art="people"
          title="No departments or teams yet"
          description="Start with a department, like Engineering, or a team. Say what each one does: Mytes use it to tune notes to every role and to spot who is missing from a meeting."
          action={
            <>
              <NewDepartmentButton departments={[]} variant="primary" />
              <NewTeamButton departments={[]} people={PICK_PEOPLE} variant="outline" />
            </>
          }
        />
      </Page>
    );
  else
    body = (
      <Page>
        <PageHead title="People" context={CONTEXT} action={actions}>
          {!admin ? (
            <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-3">
              <LockSimple size={16} aria-hidden />
              Only workspace owners and admins can change departments and teams.
            </p>
          ) : null}
        </PageHead>
        <PeopleBoard chart={CHART} departments={PICK_DEPARTMENTS} members={MEMBER_OPTIONS} canEdit={admin} />
      </Page>
    );
  return (
    <>
      <Shell theme={theme}>{body}</Shell>
      <Toaster />
    </>
  );
}
