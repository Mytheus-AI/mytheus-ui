"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useOrganizationList, useUser } from "@clerk/nextjs";
import { CaretRight, Check, Copy, Plus } from "@phosphor-icons/react";
import { AuthShell } from "./AuthShell";
import { FormAlert, PrimaryButton, Spinner, StepHeader, TextButton, TextField } from "./fields";
import { AFTER_AUTH_URL, firstError } from "./clerk-helpers";
import { Avatar } from "@/components/ui/Avatar";
import { OrgMark } from "@/components/tenant/OrgMark";
import { Button } from "@/components/ui/Button";
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
  // Set while a workspace is being entered, so the "already has a workspace" redirect above does
  // not race the hand-off to the next onboarding step once the session turns active.
  const entering = useRef(false);

  // No session at all: this page has nothing to offer. An active session that owes no task
  // has nothing to do here either.
  // `?switch=1` (the sidebar's workspace button, and invitation emails) keeps the chooser open
  // for someone who already has a workspace, so they can switch or accept an invitation.
  // Read from `window` in the effect, not `useSearchParams`, so the page needs no Suspense.
  useEffect(() => {
    if (!clerk.loaded || entering.current) return;
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
    entering.current = true;
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
            entering.current = false;
            return;
          }
          // A switch (the sidebar's workspace button, an invitation email) goes straight back to
          // the app; a first workspace goes on to "About you" (ADR-0038 D11), which itself skips
          // ahead for someone whose agent already knows their role.
          const switching = new URLSearchParams(window.location.search).get("switch") === "1";
          router.push(switching ? AFTER_AUTH_URL : "/onboarding/profile?from=workspace");
        },
      });
    } catch (err) {
      setError(firstError(err));
      setBusy(null);
      entering.current = false;
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
        title: "Every team needs one shared memory.",
        lead: "A workspace is where a decision made in one meeting becomes context in the next, for everyone in it.",
      }}
      scene={{
        you: youSeed,
        label: path === "create" ? name.trim() || "your team" : undefined,
        lines:
          path === "create"
            ? [
                { who: 0, text: "New table, who's in?" },
                { who: 1, text: "Invite the team later.", keep: { tag: "Action", text: "Invite your teammates" } },
                { who: 4, text: "Start the workspace.", keep: { tag: "Decision", text: "Workspace created" } },
                { who: 2, text: "Every meeting lands here.", keep: { tag: "Done", text: "Shared memory is on" } },
              ]
            : [
                { who: 3, text: "Got an invite?", keep: { tag: "Question", text: "Waiting on an invite?" } },
                { who: 1, text: "Your admin can send one.", keep: { tag: "Action", text: "Ask your admin" } },
                { who: 0, text: "Pull up a chair with us.", keep: { tag: "Done", text: "Teammate joined" } },
              ],
      }}
      aside={
        user ? (
          <span className="inline-flex items-center justify-end gap-x-3">
            <span className="hidden max-w-[24ch] truncate sm:inline">{email}</span>
            <TextButton onClick={() => void clerk.signOut({ redirectUrl: "/sign-in" })}>Sign out</TextButton>
          </span>
        ) : null
      }
    >
      <StepHeader kicker="Set up your workspace" title="Where will your Myte work?">
        Join the workspace your team already uses, or start a new one.
      </StepHeader>

      {error ? <FormAlert>{error}</FormAlert> : null}

      {loading || path === null ? (
        <div className="flex h-40 items-center justify-center text-ink-3" role="status">
          <Spinner />
          <span className="sr-only">Loading your workspaces</span>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Join or create a workspace" className="mb-6 grid grid-cols-2 gap-1 rounded-ctl bg-bg-2 p-1">
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
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-ctl px-2 text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-150 ${
                  path === key ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:text-ink"
                }`}
              >
                <span className="truncate">{label}</span>
                {count ? (
                  <span
                    className={`grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[12.5px] tabular-nums ${
                      path === key ? "bg-signal-soft text-signal-ink" : "bg-surface text-ink-3"
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {path === "join" ? (
            <div role="tabpanel" className="space-y-2.5">
              {memberships.map((m) => (
                <OrgRow
                  key={m.id}
                  name={m.organization.name}
                  imageUrl={m.organization.hasImage ? m.organization.imageUrl : undefined}
                  meta={`${m.role.replace(/^org:/, "").replace(/^\w/, (c) => c.toUpperCase())}, ${m.organization.membersCount} member${m.organization.membersCount === 1 ? "" : "s"}`}
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
                    meta={requested ? "Requested, waiting for an admin" : `Matches your ${email.split("@")[1] ?? "email"} address`}
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
                <div className="rounded-card border border-line bg-surface-2 p-5">
                  <p className="text-[15.5px] font-semibold text-ink">No invitations yet</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-3">
                    Ask an admin of your team&rsquo;s workspace to invite this email. If your company has verified its
                    email domain, workspaces you can ask to join show up here on their own.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="max-w-full"
                      aria-label={copied ? "Email copied" : `Copy ${email}`}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(email);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1800);
                        } catch {
                          setCopied(false);
                        }
                      }}
                    >
                      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                      <span className="truncate">{copied ? "Copied" : email}</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={refresh}>
                      Check again
                    </Button>
                    <span className="sr-only" aria-live="polite">
                      {copied ? "Email copied" : ""}
                    </span>
                  </div>
                </div>
              ) : null}

              <p className="pt-3 text-center text-[14px] text-ink-3">
                Not here? <TextButton onClick={() => setPath("create")}>Start a workspace instead</TextButton>
              </p>
            </div>
          ) : (
            <form role="tabpanel" onSubmit={create} noValidate className="space-y-5">
              {/* the workspace being named, with its first seat taken */}
              <div className="rounded-card border border-line bg-surface-2 p-4" aria-hidden>
                <p className="display truncate text-[24px] leading-tight">{name.trim() || "Your workspace"}</p>
                <div className="mt-3 flex items-center">
                  <Avatar name="You" seed={youSeed} size="md" ring />
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="-ml-1.5 grid h-9 w-9 place-items-center rounded-full border border-dashed border-line-2 bg-surface text-ink-4 first-of-type:ml-1.5"
                    >
                      <Plus size={13} weight="bold" />
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
                  Your team already has one? <TextButton onClick={() => setPath("join")}>Join it instead</TextButton>
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
      aria-busy={busy || undefined}
      className={`group flex min-h-[64px] w-full items-center gap-3.5 rounded-card border bg-surface p-3 pr-4 text-left transition-colors duration-150 enabled:hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-70 ${
        highlight ? "border-signal-line" : "border-line enabled:hover:border-line-2"
      }`}
    >
      {/* The workspace's logo, mirrored to its Clerk organization when an admin saves it in Mytheus
          (ADR-0048); the initial when it has none or it fails to load. The name follows, so the
          mark is decorative. */}
      <OrgMark name={name} logoUrl={imageUrl} size={44} tone="peach" decorative />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold text-ink">{name}</span>
        <span className={`mt-0.5 block truncate text-[13px] ${highlight ? "text-signal-ink" : "text-ink-3"}`}>{meta}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-ink-2 transition-colors group-hover:text-ink">
        {busy ? <Spinner /> : action}
        {!busy && !disabled ? <CaretRight size={14} weight="bold" aria-hidden /> : null}
      </span>
    </button>
  );
}
