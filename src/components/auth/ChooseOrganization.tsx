"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useOrganizationList, useUser } from "@clerk/nextjs";
import { AuthShell } from "./AuthShell";
import { FormAlert, PrimaryButton, Spinner, StepHeader, TextButton, TextField } from "./fields";
import { AFTER_AUTH_URL, firstError } from "./clerk-helpers";
import { ArrowRight } from "@/components/landing/ui";
import { Doodle } from "@/components/ui/Doodle";
import { defaultDoodleSeed, isDoodleSeed } from "@/lib/doodle";
import { provisionActiveWorkspace } from "@/app/actions/workspace";

/* ================================================================== */
/*  The "choose-organization" session task, made our own. A new        */
/*  account is signed in but "pending" until it belongs to an          */
/*  organization, because every request the gateway serves is scoped   */
/*  to one. Two paths, chosen up front:                                */
/*                                                                     */
/*  Join a team - continue into a workspace you are already in, accept */
/*  an invitation, or ask to join a workspace that has verified your   */
/*  email's domain (Clerk "suggestions"; an admin approves, or the     */
/*  workspace lets you straight in, depending on its enrollment mode). */
/*  Workspaces are never searchable by name: Clerk does not let a      */
/*  stranger list organizations they are not in, and that is right.    */
/*                                                                     */
/*  Start a workspace - name it and create it.                         */
/* ================================================================== */

type Path = "join" | "create";

export function ChooseOrganization() {
  const router = useRouter();
  const clerk = useClerk();
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded, createOrganization, setActive, userMemberships, userInvitations, userSuggestions } =
    useOrganizationList({
      userMemberships: { infinite: true },
      userInvitations: { infinite: true },
      userSuggestions: { infinite: true },
    });

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [path, setPath] = useState<Path | null>(null);
  const [copied, setCopied] = useState(false);

  // No session at all: this page has nothing to offer. An active session that owes no task
  // has nothing to do here either.
  // `?switch=1` (the sidebar's workspace button, and invitation emails) keeps the chooser open
  // for someone who already has a workspace, so they can switch or accept an invitation.
  // Read from `window` in the effect, not `useSearchParams`, so the page needs no Suspense.
  useEffect(() => {
    if (!clerk.loaded) return;
    const switching = new URLSearchParams(window.location.search).get("switch") === "1";
    if (!clerk.session) router.replace("/sign-in");
    else if (!switching && clerk.session.status === "active" && clerk.session.lastActiveOrganizationId)
      router.replace(AFTER_AUTH_URL);
  }, [clerk.loaded, clerk.session, router]);

  useEffect(() => {
    if (!name && user?.firstName) setName(`${user.firstName}’s team`);
  }, [user?.firstName, name]);

  const memberships = userMemberships.data ?? [];
  const invitations = (userInvitations.data ?? []).filter((i) => i.status === "pending");
  const suggestions = userSuggestions.data ?? [];
  const joinable = memberships.length + invitations.length + suggestions.length;
  const loading = !isLoaded || !userLoaded || userMemberships.isLoading || userInvitations.isLoading;

  // Open on "join" when there is something to join, otherwise on "create"; the visitor can switch.
  useEffect(() => {
    if (!loading && path === null) setPath(joinable > 0 ? "join" : "create");
  }, [loading, joinable, path]);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const metaSeed = (user?.unsafeMetadata as Record<string, unknown> | undefined)?.doodle;
  const youSeed = isDoodleSeed(metaSeed) ? metaSeed : defaultDoodleSeed(email || user?.id || "you");

  const enter = async (organizationId: string, key: string) => {
    if (!setActive) return;
    setBusy(key);
    setError(null);
    try {
      await setActive({
        organization: organizationId,
        navigate: async () => {
          // Mint a token that carries the org just made active, so the server action below
          // reads it from the refreshed session cookie rather than the pre-switch one.
          await clerk.session?.getToken({ skipCache: true });
          const outcome = await provisionActiveWorkspace();
          if (!outcome.ok) {
            setError(
              outcome.reason === "not_admin"
                ? "This workspace isn't set up yet. Ask its admin to sign in once to finish setting it up."
                : "We couldn't set up your workspace just now. Try again in a moment.",
            );
            setBusy(null);
            return;
          }
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

  const refresh = () => {
    void userInvitations.revalidate?.();
    void userSuggestions.revalidate?.();
    void userMemberships.revalidate?.();
  };

  return (
    <AuthShell
      stage={{
        kicker: "Your workspace",
        title: "Every team needs",
        accent: "a table.",
        blurb: "A workspace is where a decision made in one meeting becomes context in the next, for everyone in it.",
      }}
      scene={{
        you: youSeed,
        label: path === "create" ? name.trim() || "your team" : undefined,
        lines:
          path === "create"
            ? [
                { text: "New table, who's in?" },
                { text: "Invite the team later." },
                { text: "Start the workspace.", decision: true },
              ]
            : [
                { text: "Got an invite?" },
                { text: "Your admin can send one." },
                { text: "Pull up a chair with us.", decision: true },
              ],
        note: path === "create" ? "Workspace created" : "New teammate joined",
      }}
      aside={
        user ? (
          <span className="inline-flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="max-w-[22ch] truncate">{email}</span>
            <TextButton onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}>Sign out</TextButton>
          </span>
        ) : null
      }
    >
      <StepHeader kicker="Set up your workspace" title="Where will your agent work?">
        Join the workspace your team already uses, or start a new one.
      </StepHeader>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading || path === null ? (
        <div className="flex h-40 items-center justify-center text-ink-3">
          <Spinner />
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Join or create a workspace"
            className="auth-rise mb-6 grid grid-cols-2 gap-1 rounded-full border-[1.5px] border-line-2 bg-surface p-1"
            style={{ ["--d" as string]: "60ms" }}
          >
            {(
              [
                ["join", "Join a team", joinable],
                ["create", "Start a workspace", null],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={path === key}
                onClick={() => {
                  setPath(key);
                  setError(null);
                }}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors focus-visible:!rounded-full ${
                  path === key ? "bg-[var(--doodle-ink)] text-[#fffaf0]" : "text-ink-3 hover:text-ink"
                }`}
              >
                {label}
                {count ? (
                  <span
                    className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[11px] tabular-nums ${
                      path === key ? "bg-signal text-white" : "bg-bg-2 text-ink-2"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {path === "join" ? (
            <div role="tabpanel" className="auth-rise space-y-3" style={{ ["--d" as string]: "100ms" }}>
              {memberships.map((m) => (
                <OrgRow
                  key={m.id}
                  name={m.organization.name}
                  imageUrl={m.organization.hasImage ? m.organization.imageUrl : undefined}
                  meta={`You're a ${m.role.replace(/^org:/, "")} · ${m.organization.membersCount} member${m.organization.membersCount === 1 ? "" : "s"}`}
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
                  imageUrl={inv.publicOrganizationData.hasImage ? inv.publicOrganizationData.imageUrl : undefined}
                  meta="You're invited"
                  action="Join"
                  highlight
                  busy={busy === inv.id}
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(inv.id);
                    setError(null);
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
              {suggestions.map((s) => {
                const requested = s.status === "accepted";
                return (
                  <OrgRow
                    key={s.id}
                    name={s.publicOrganizationData.name}
                    imageUrl={s.publicOrganizationData.hasImage ? s.publicOrganizationData.imageUrl : undefined}
                    meta={requested ? "Requested · waiting for an admin" : `Matches your ${email.split("@")[1] ?? "email"} address`}
                    action={requested ? "Requested" : "Ask to join"}
                    busy={busy === s.id}
                    disabled={!!busy || requested}
                    onClick={async () => {
                      setBusy(s.id);
                      setError(null);
                      try {
                        await s.accept();
                        refresh();
                      } catch (err) {
                        setError(firstError(err));
                      } finally {
                        setBusy(null);
                      }
                    }}
                  />
                );
              })}

              {joinable === 0 ? (
                <div className="rounded-[20px] border-[1.5px] border-dashed border-line-2 bg-surface/70 p-5">
                  <div className="flex items-start gap-4">
                    <span className="block h-14 w-14 shrink-0 -rotate-3 overflow-hidden rounded-full border-[2px] border-[var(--doodle-ink)]">
                      <Doodle seed="waiting-room" className="block h-full w-full" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-semibold text-ink">No invitations yet</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
                        Ask an admin of your team&rsquo;s workspace to invite this email. If your company has verified
                        its email domain, workspaces you can ask to join show up here on their own.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(email);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        } catch {
                          setCopied(false);
                        }
                      }}
                      className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border-[1.5px] border-line-2 bg-surface px-3.5 text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-ink-3 hover:text-ink"
                    >
                      <span className="truncate">{copied ? "Copied" : email}</span>
                      {!copied ? <span className="text-ink-3">Copy</span> : null}
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      className="inline-flex h-9 items-center rounded-full px-3 text-[13.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
                    >
                      Check again
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="pt-2 text-center text-[14px] text-ink-3">
                Not here?{" "}
                <TextButton onClick={() => setPath("create")}>Start a workspace instead</TextButton>
              </p>
            </div>
          ) : (
            <form role="tabpanel" onSubmit={create} noValidate className="auth-rise space-y-5" style={{ ["--d" as string]: "100ms" }}>
              {/* the workspace being named, with its first seat taken */}
              <div className="rounded-[20px] border-[1.5px] border-line-2 bg-surface p-4">
                <p className="font-hand -rotate-1 truncate text-[28px] font-bold leading-tight text-ink">
                  {name.trim() || "Your workspace"}
                </p>
                <div className="mt-3 flex items-center">
                  <span className="block h-10 w-10 overflow-hidden rounded-full border-[2px] border-[var(--doodle-ink)] shadow-[0_0_0_3px_var(--signal)]">
                    <Doodle key={youSeed} seed={youSeed} className="block h-full w-full" />
                  </span>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="-ml-1.5 grid h-10 w-10 place-items-center rounded-full border-[2px] border-dashed border-line-2 bg-bg text-[18px] font-semibold text-ink-3 first:ml-2"
                      aria-hidden
                    >
                      +
                    </span>
                  ))}
                  <span className="ml-3 text-[13px] text-ink-3">You, then your team</span>
                </div>
              </div>
              <TextField
                label="Workspace name"
                autoComplete="organization"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                hint="Usually your company or team name. You can change it later."
                autoFocus
              />
              <PrimaryButton loading={busy === "create"} disabled={!!busy && busy !== "create"}>
                Create workspace
              </PrimaryButton>
              {joinable > 0 ? (
                <p className="text-center text-[14px] text-ink-3">
                  Your team already has one?{" "}
                  <TextButton onClick={() => setPath("join")}>Join it instead</TextButton>
                </p>
              ) : null}
            </form>
          )}
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
      className={`group flex w-full items-center gap-4 rounded-[20px] border-[1.5px] bg-surface p-3.5 pr-4 text-left transition-colors duration-150 enabled:hover:bg-bg-2 disabled:cursor-not-allowed disabled:opacity-75 ${
        highlight ? "border-signal" : "border-line-2 enabled:hover:border-ink-3"
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-[14px] object-cover" />
      ) : (
        <span className="block h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border-[1.5px] border-[var(--doodle-ink)]">
          <Doodle seed={`org:${name.toLowerCase()}`} className="block h-full w-full scale-[1.15]" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">{name}</span>
        <span className={`mt-0.5 block truncate text-[13px] ${highlight ? "text-signal-deep" : "text-ink-3"}`}>{meta}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold text-ink-2 transition-colors group-hover:text-ink">
        {busy ? <Spinner /> : action}
        {!busy && !disabled ? <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" /> : null}
      </span>
    </button>
  );
}
