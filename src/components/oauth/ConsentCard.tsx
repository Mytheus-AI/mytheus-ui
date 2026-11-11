"use client";

import { useId, useState } from "react";
import { CheckCircle, Desktop, Globe, Prohibit, SealCheck, ShieldCheck } from "@phosphor-icons/react";
import { decideAppConsent } from "@/app/actions/oauth";
import { Button } from "@/components/ui/Button";
import { cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FieldMsg } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { CONSENT_NEVER, CONSENT_SCOPE, scopeChoices, type ConsentProblem, type OAuthScope } from "@/lib/oauth-consent";

/* The decision: which app, where approving sends you, which workspace and account, and what it
   may do. A person can narrow "Read and act" to "Read only", never widen it. Approve and Deny both
   end by sending the browser back to the app's own registered callback, which the server returned;
   the page says where it is going while it goes.

   The app's name is what it called itself at registration, so it is never the only signal: the
   return address is shown beside it, marked verified only for Claude's own callback, with a plain
   warning for anything else and for apps on this computer. */

export interface ConsentDetailsView {
  client: {
    client_id: string;
    name: string;
    redirect_host: string;
    verified_redirect: boolean;
    loopback_redirect: boolean;
  };
  scope: OAuthScope;
  workspace: { name: string };
  account_email?: string | null;
}

type Done = { decision: "approve" | "deny"; url: string };

export function ConsentCard({
  details,
  request,
  onProblem,
}: {
  details: ConsentDetailsView;
  request: string;
  /** the request stopped being approvable while the page was open (expired, app removed) */
  onProblem?: (problem: ConsentProblem) => void;
}) {
  const uid = useId();
  const { client, workspace } = details;
  const choices = scopeChoices(details.scope);
  const [scope, setScope] = useState<OAuthScope>(details.scope);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  const decide = async (decision: "approve" | "deny") => {
    if (busy || done) return;
    setBusy(decision);
    setError(null);
    const res = await decideAppConsent({ request, decision, scope: decision === "approve" ? scope : undefined });
    if (!res.ok) {
      setBusy(null);
      if (res.problem && onProblem) {
        onProblem(res.problem);
        return;
      }
      setError(res.message);
      return;
    }
    setDone({ decision: res.decision, url: res.redirectTo });
    window.location.assign(res.redirectTo);
  };

  const where = client.loopback_redirect ? "an app on this computer" : client.redirect_host;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] lg:gap-8">
      <section aria-labelledby={`${uid}-title`} className={cardClass({ flush: true, className: "shadow-warm-1" })}>
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <p className="kicker">Connect an app</p>
          <h1 id={`${uid}-title`} className="display mt-2 text-[28px] leading-[1.12] text-ink-display [overflow-wrap:anywhere] sm:text-[34px]">
            {client.name} wants to use Mytheus as you
          </h1>
          <p className="mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-2">
            Approving lets {client.name} reach the {workspace.name} workspace with your access, and sends you back to {where}.
          </p>

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-y border-line py-5 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-ink-3">Workspace</dt>
              <dd className="mt-1 truncate text-[15px] font-semibold text-ink">{workspace.name}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-ink-3">Returns you to</dt>
              <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-[15px] font-semibold text-ink">
                {client.loopback_redirect ? <Desktop size={16} className="shrink-0 text-ink-3" aria-hidden /> : <Globe size={16} className="shrink-0 text-ink-3" aria-hidden />}
                <span className="min-w-0 truncate font-mono text-[14px]">{client.redirect_host}</span>
                {client.verified_redirect ? (
                  <Chip tone="ok">
                    <SealCheck size={14} weight="fill" aria-hidden />
                    Verified
                  </Chip>
                ) : client.loopback_redirect ? (
                  <Chip tone="neutral">This computer</Chip>
                ) : (
                  <Chip tone="medium">Not verified</Chip>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[13px] font-semibold text-ink-3">Account</dt>
              <dd className="mt-1 truncate text-[15px] font-semibold text-ink">{details.account_email ?? "You"}</dd>
            </div>
          </dl>

          {!client.verified_redirect ? (
            <Note tone="warning" className="mt-5">
              {client.loopback_redirect
                ? `This app runs on your computer (${client.redirect_host}). Approve only if you just started connecting it from an app on this computer.`
                : `Mytheus does not recognise ${client.redirect_host}. Approve only if you started connecting ${client.name} yourself and expected to return there.`}
            </Note>
          ) : null}

          <fieldset className="mt-6" disabled={!!busy || !!done}>
            <legend className="mb-2 text-[15px] font-semibold text-ink">Access</legend>
            {choices.length > 1 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {choices.map((s) => (
                  <label
                    key={s}
                    className={`flex cursor-pointer items-start gap-3 rounded-ctl border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                      scope === s ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]" : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
                    }`}
                  >
                    <input type="radio" name={`${uid}-scope`} value={s} checked={scope === s} onChange={() => setScope(s)} className="sr-only" />
                    <span aria-hidden="true" className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${scope === s ? "border-signal" : "border-ink-3"}`}>
                      {scope === s ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-ink">{CONSENT_SCOPE[s].label}</span>
                      <span className="block text-[13px] leading-snug text-ink-3">{CONSENT_SCOPE[s].help}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="rounded-ctl border border-line-2 bg-surface-2 px-3.5 py-3">
                <p className="text-[14px] font-semibold text-ink">{CONSENT_SCOPE.read.label}</p>
                <p className="text-[13px] leading-snug text-ink-3">{CONSENT_SCOPE.read.help}</p>
              </div>
            )}
          </fieldset>

          {error ? (
            <div className="mt-4">
              <FieldMsg id={`${uid}-error`} error={error} />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            {done ? null : (
              <>
                <Button variant="outline" onClick={() => void decide("deny")} disabled={!!busy} aria-busy={busy === "deny"}>
                  {busy === "deny" ? "Denying" : "Deny"}
                </Button>
                <Button onClick={() => void decide("approve")} disabled={!!busy} aria-busy={busy === "approve"} aria-describedby={error ? `${uid}-error` : undefined}>
                  <ShieldCheck size={18} aria-hidden />
                  {busy === "approve" ? "Allowing access" : "Allow access"}
                </Button>
              </>
            )}
          </div>

          <div role="status" aria-live="polite" className="empty:hidden">
            {done ? (
              <Note tone={done.decision === "approve" ? "success" : "info"} className="mt-4">
                {done.decision === "approve" ? `Access allowed. Returning you to ${where}.` : `You denied access. Returning you to ${where}.`}{" "}
                <a href={done.url} className="font-semibold underline underline-offset-4">
                  Continue
                </a>
              </Note>
            ) : null}
          </div>
          <p className="mt-5 text-[13px] text-ink-3">This request lasts 15 minutes. You can disconnect the app at any time in Settings, API access.</p>
        </div>
      </section>

      <aside aria-labelledby={`${uid}-can`} className={cardClass({ tone: "well", className: "sm:!p-6" })}>
        <h2 id={`${uid}-can`} className="text-[16px] font-semibold text-ink">
          What {client.name} can do
        </h2>
        <ul className="mt-3 space-y-2.5">
          {CONSENT_SCOPE[scope].can.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-2">
              <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-ok" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <h2 className="mt-6 text-[16px] font-semibold text-ink">What it can never do</h2>
        <ul className="mt-3 space-y-2.5">
          {CONSENT_NEVER.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-2">
              <Prohibit size={18} className="mt-px shrink-0 text-ink-3" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-4 text-[13px] leading-relaxed text-ink-3">
          It sees only what you can see in Mytheus, and every action it takes is recorded as yours. App ID{" "}
          <code className="break-all font-mono text-[12.5px] text-ink-2">{client.client_id}</code>
        </p>
      </aside>
    </div>
  );
}
