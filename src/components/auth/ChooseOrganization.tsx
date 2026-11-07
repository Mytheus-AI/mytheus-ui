"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useOrganizationList, useUser } from "@clerk/nextjs";
import { AuthShell } from "./AuthShell";
import { FormAlert, OrDivider, PrimaryButton, Spinner, StepHeader, TextButton, TextField } from "./fields";
import { AFTER_AUTH_URL, firstError } from "./clerk-helpers";
import { ArrowRight } from "@/components/landing/ui";

/* ================================================================== */
/*  The "choose-organization" session task, made our own. A new        */
/*  account is signed in but "pending" until it belongs to an          */
/*  organization, because every request the gateway serves is scoped   */
/*  to one. Here you continue into one you are in, accept an invite,   */
/*  or create a workspace.                                             */
/* ================================================================== */

export function ChooseOrganization() {
  const router = useRouter();
  const clerk = useClerk();
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded, createOrganization, setActive, userMemberships, userInvitations } = useOrganizationList({
    userMemberships: { infinite: true },
    userInvitations: { infinite: true },
  });

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // No session at all: this page has nothing to offer. An active session that owes no task
  // has nothing to do here either.
  useEffect(() => {
    if (!clerk.loaded) return;
    if (!clerk.session) router.replace("/sign-in");
    else if (clerk.session.status === "active" && clerk.session.lastActiveOrganizationId) router.replace(AFTER_AUTH_URL);
  }, [clerk.loaded, clerk.session, router]);

  useEffect(() => {
    if (!name && user?.firstName) setName(`${user.firstName}’s team`);
  }, [user?.firstName, name]);

  const enter = async (organizationId: string, key: string) => {
    if (!setActive) return;
    setBusy(key);
    setError(null);
    try {
      await setActive({
        organization: organizationId,
        navigate: async () => {
          router.push(AFTER_AUTH_URL);
        },
      });
    } catch (err) {
      setError(firstError(err));
      setBusy(null);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!createOrganization) return;
    if (!name.trim()) return setError("Give your workspace a name.");
    setBusy("create");
    setError(null);
    try {
      const org = await createOrganization({ name: name.trim() });
      await enter(org.id, "create");
    } catch (err) {
      setError(firstError(err));
      setBusy(null);
    }
  };

  const memberships = userMemberships.data ?? [];
  const invitations = (userInvitations.data ?? []).filter((i) => i.status === "pending");
  const initials = useMemo(
    () =>
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("") || "M",
    [name],
  );
  const loading = !isLoaded || !userLoaded;

  return (
    <AuthShell
      stage={{
        kicker: "Your workspace",
        title: "Give your team",
        accent: "a shared memory.",
        blurb: "A workspace is where decisions made in one meeting become context in the next, for everyone in it.",
      }}
      aside={
        user ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="max-w-[22ch] truncate">{user.primaryEmailAddress?.emailAddress}</span>
            <TextButton onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}>Sign out</TextButton>
          </span>
        ) : null
      }
    >
      <StepHeader kicker="Set up your workspace" title="Where will your agent work?">
        Create a workspace for your team, or continue into one you already belong to.
      </StepHeader>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-ink-3">
          <Spinner />
        </div>
      ) : (
        <>
          {memberships.length || invitations.length ? (
            <div className="auth-rise space-y-3" style={{ ["--d" as string]: "80ms" }}>
              {memberships.map((m) => (
                <OrgRow
                  key={m.id}
                  name={m.organization.name}
                  imageUrl={m.organization.imageUrl}
                  meta={`${m.role.replace(/^org:/, "")} · ${m.organization.membersCount} member${m.organization.membersCount === 1 ? "" : "s"}`}
                  action="Continue"
                  busy={busy === m.id}
                  disabled={!!busy}
                  onClick={() => void enter(m.organization.id, m.id)}
                />
              ))}
              {invitations.map((inv) => (
                <OrgRow
                  key={inv.id}
                  name={inv.publicOrganizationData.name}
                  imageUrl={inv.publicOrganizationData.imageUrl}
                  meta="You're invited"
                  action="Join"
                  highlight
                  busy={busy === inv.id}
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(inv.id);
                    try {
                      await inv.accept();
                      await enter(inv.publicOrganizationData.id, inv.id);
                    } catch (err) {
                      setError(firstError(err));
                      setBusy(null);
                    }
                  }}
                />
              ))}
              <OrDivider>or create a new one</OrDivider>
            </div>
          ) : null}

          <form onSubmit={create} noValidate className="auth-rise space-y-5" style={{ ["--d" as string]: "140ms" }}>
            {/* live preview of the workspace being named */}
            <div className="flex items-center gap-4 rounded-[22px] border border-line bg-white p-4 shadow-[0_24px_50px_-36px_rgba(40,30,20,0.5)]">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-signal text-[19px] font-medium tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[17px] font-medium tracking-[-0.02em] text-ink">{name.trim() || "Your workspace"}</p>
                <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">1 member &middot; you</p>
              </div>
            </div>
            <TextField
              label="Workspace name"
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              hint="Usually your company or team name. You can change it later."
              autoFocus={!memberships.length}
            />
            <PrimaryButton loading={busy === "create"} disabled={!!busy && busy !== "create"}>
              Create workspace
            </PrimaryButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}

function OrgRow({
  name,
  imageUrl,
  meta,
  action,
  onClick,
  busy,
  disabled,
  highlight,
}: {
  name: string;
  imageUrl?: string;
  meta: string;
  action: string;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`card-interactive group flex w-full items-center gap-4 rounded-[20px] border bg-white p-3.5 pr-4 text-left disabled:cursor-not-allowed disabled:opacity-70 ${
        highlight ? "border-signal-bright" : "border-line"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg-2 text-[16px] font-medium text-ink-2">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-medium tracking-[-0.01em] text-ink">{name}</span>
        <span className={`mt-0.5 block truncate text-[13px] capitalize ${highlight ? "text-signal-deep" : "text-ink-3"}`}>{meta}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 transition-colors group-hover:text-ink">
        {busy ? <Spinner /> : action}
        {!busy ? <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" /> : null}
      </span>
    </button>
  );
}
