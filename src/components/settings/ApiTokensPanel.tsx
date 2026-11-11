"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Key, Plus, Warning } from "@phosphor-icons/react";
import { createToken, revokeToken } from "@/app/actions/api-tokens";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifyError, notifySuccess } from "@/lib/toast";
import {
  DEFAULT_EXPIRY_DAYS,
  EXPIRY_OPTIONS,
  MAX_ACTIVE_TOKENS,
  MAX_NAME,
  SCOPE_HELP,
  SCOPE_LABEL,
  activeCount,
  sortTokens,
  tokenStatus,
  type ApiTokenRow,
  type TokenScope,
} from "@/lib/api-access";

/* Personal access tokens: list, create (the token shown once), revoke with a confirm step.

   The list is a table from md up (name, access, status, last used, created, revoke) and a stack
   of labelled rows below it. Create opens a dialog whose second step shows the token once, with
   Copy and a plain warning; closing it drops the text from memory. Revoke cannot be undone (a
   revoked token never works again), so it asks first and its toast has no Undo. */

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? date.format(new Date(iso)) : null);

export function ApiTokensPanel({ initial, nowIso }: { initial: ApiTokenRow[]; nowIso: string }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => sortTokens(initial));
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiTokenRow | null>(null);
  const now = new Date(nowIso);

  useEffect(() => setRows(sortTokens(initial)), [initial]);

  const active = activeCount(rows);
  const atLimit = active >= MAX_ACTIVE_TOKENS;

  return (
    <section aria-labelledby="tokens-heading" className={cardClass({ flush: true })}>
      <CardHead
        id="tokens-heading"
        as="h3"
        title="Personal access tokens"
        description={`A token lets another tool act as you, with your access and nothing more. Up to ${MAX_ACTIVE_TOKENS} active at a time.`}
        right={
          <Button size="sm" onClick={() => setCreating(true)} disabled={atLimit} aria-describedby={atLimit ? "tokens-limit" : undefined}>
            <Plus size={16} weight="bold" aria-hidden />
            Create token
          </Button>
        }
      />
      {atLimit ? (
        <div className="border-t border-line px-4 py-3 sm:px-[22px]" id="tokens-limit">
          <Note tone="warning">You have {MAX_ACTIVE_TOKENS} active tokens, the most allowed. Revoke one you no longer use to create another.</Note>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            inCard
            art="line"
            title="No tokens yet"
            description="Create one for each tool you connect, such as Claude Desktop or a script, so you can revoke one without breaking the others."
            action={
              <Button size="sm" variant="outline" onClick={() => setCreating(true)}>
                <Plus size={16} weight="bold" aria-hidden />
                Create token
              </Button>
            }
          />
        </div>
      ) : (
        <div className="border-t border-line">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_96px] gap-4 bg-surface-2 px-[22px] py-2.5 text-[12.5px] font-semibold text-ink-3 md:grid"
          >
            <span>Name</span>
            <span>Access</span>
            <span>Status</span>
            <span>Last used</span>
            <span>Created</span>
            <span className="sr-only">Revoke</span>
          </div>
          <ul className="divide-y divide-line" aria-label="Your tokens">
            {rows.map((t) => {
              const status = tokenStatus(t, now);
              const live = t.state === "active";
              return (
                <li
                  key={t.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-[22px] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_96px]"
                >
                  <div className="min-w-0">
                    <p className={`truncate text-[15px] font-semibold ${live ? "text-ink" : "text-ink-3"}`}>{t.name}</p>
                    <p className="truncate font-mono text-[12.5px] text-ink-3">{t.token_preview}</p>
                  </div>
                  <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto md:order-none">
                    <Chip tone={t.scope === "read_write" ? "accent" : "neutral"}>{SCOPE_LABEL[t.scope]}</Chip>
                  </div>
                  <div className="text-[14px]">
                    <span className="sr-only md:hidden">Status: </span>
                    <Chip tone={status.tone}>{status.label}</Chip>
                    {live ? <span className="mt-1 block text-[12.5px] text-ink-3">Until {fmt(t.expires_at)}</span> : null}
                  </div>
                  <p className="text-[14px] text-ink-2">
                    <span className="text-ink-3 md:hidden">Last used </span>
                    {fmt(t.last_used_at) ?? "Never"}
                  </p>
                  <p className="hidden text-[14px] text-ink-2 md:block">{fmt(t.created_at)}</p>
                  <div className="col-span-2 flex md:col-span-1 md:justify-end">
                    {live ? (
                      <Button variant="danger-outline" size="sm" onClick={() => setRevoking(t)} aria-label={`Revoke ${t.name}`}>
                        Revoke
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <CreateTokenDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(item) => {
          setRows((r) => sortTokens([item, ...r]));
          router.refresh();
        }}
      />
      <RevokeTokenDialog
        token={revoking}
        onClose={() => setRevoking(null)}
        onRevoked={(id) => {
          setRows((r) => sortTokens(r.map((x) => (x.id === id ? { ...x, state: "revoked", revoked_at: new Date().toISOString() } : x))));
          router.refresh();
        }}
      />
    </section>
  );
}

function CreateTokenDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (item: ApiTokenRow) => void }) {
  const uid = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<TokenScope>("read");
  const [days, setDays] = useState(DEFAULT_EXPIRY_DAYS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [secret, setSecret] = useState<{ token: string; name: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setScope("read");
    setDays(DEFAULT_EXPIRY_DAYS);
    setError(null);
    setSecret(null);
  }, [open]);

  const close = () => {
    setSecret(null); // the token text leaves memory with the dialog
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await createToken({ name, scope, expiresInDays: days });
    setBusy(false);
    if (!res.ok) {
      setError({ message: res.message, field: res.field });
      if (res.field === "name") nameRef.current?.focus();
      return;
    }
    setSecret({ token: res.token, name: res.item.name });
    onCreated(res.item);
    notifySuccess("Token created", { description: "Copy it now. It is shown only once." });
  };

  const nameErr = error?.field === "name" ? error.message : null;

  if (secret) {
    return (
      <Dialog open={open} onClose={close} title="Copy your new token" size="lg" description={`"${secret.name}" is ready. Store it somewhere safe, such as a password manager.`}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-ctl bg-priority-medium-soft px-4 py-3 text-priority-medium" role="note">
            <Warning size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
            <p className="text-[14px] font-semibold leading-snug">
              This is the only time the token is shown. Mytheus keeps just its last four characters, so if you lose it, revoke it and create another.
            </p>
          </div>
          <div>
            <label htmlFor={`${uid}-secret`} className="mb-1.5 block text-[14px] font-semibold text-ink">
              Token
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                id={`${uid}-secret`}
                readOnly
                value={secret.token}
                onFocus={(e) => e.currentTarget.select()}
                spellCheck={false}
                autoComplete="off"
                className={`${fieldClass} min-w-0 flex-1 font-mono text-[14px]`}
              />
              <CopyButton value={secret.token} label="Copy token" variant="primary" size="md" />
            </div>
          </div>
          <p className="text-[14px] leading-relaxed text-ink-3">
            Treat it like a password: anyone with it can read what you can read in Mytheus. Set it as <code className="font-mono text-ink-2">MYTHEUS_TOKEN</code> and use the
            setups below.
          </p>
          <div className="flex justify-end">
            <Button onClick={close}>I have copied it</Button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      busy={busy}
      title="Create token"
      initialFocus={nameRef}
      description="Name it after the tool that will use it, so you know which one to revoke later."
    >
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <div>
          <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[14px] font-semibold text-ink">
            Name
          </label>
          <input
            ref={nameRef}
            id={`${uid}-name`}
            value={name}
            maxLength={MAX_NAME}
            onChange={(e) => {
              setName(e.target.value);
              if (nameErr) setError(null);
            }}
            placeholder="Claude Desktop"
            autoComplete="off"
            aria-invalid={nameErr ? true : undefined}
            aria-describedby={nameErr ? `${uid}-name-msg` : undefined}
            className={fieldClass}
          />
          <FieldMsg id={`${uid}-name-msg`} error={nameErr} />
        </div>

        <fieldset>
          <legend className="mb-1.5 text-[14px] font-semibold text-ink">Access</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["read", "read_write"] as const).map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-start gap-3 rounded-ctl border px-3.5 py-3 transition-[border-color,background-color,box-shadow] duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                  scope === s ? "border-signal bg-surface-2 shadow-[0_0_0_1px_var(--signal)]" : "border-line-2 bg-surface hover:border-ink-4 hover:bg-surface-2"
                }`}
              >
                <input type="radio" name={`${uid}-scope`} value={s} checked={scope === s} onChange={(e) => {
                    e.currentTarget.focus();
                    setScope(s);
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${scope === s ? "border-signal" : "border-ink-3"}`}
                >
                  {scope === s ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-ink">{SCOPE_LABEL[s]}</span>
                  <span className="block text-[12.5px] leading-snug text-ink-3">{SCOPE_HELP[s]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${uid}-expiry`} className="mb-1.5 block text-[14px] font-semibold text-ink">
            Expires after
          </label>
          <Dropdown
            id={`${uid}-expiry`}
            label="Expires after"
            className="sm:max-w-[240px]"
            value={String(days)}
            options={EXPIRY_OPTIONS.map((o) => ({ value: String(o.days), label: o.label }))}
            onChange={(v) => setDays(Number(v))}
          />
          <p className="mt-1.5 text-[12.5px] text-ink-3">Every token expires. Create a new one when it does.</p>
        </div>

        {error && error.field !== "name" ? <FieldMsg id={`${uid}-msg`} error={error.message} /> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy} aria-busy={busy}>
            <Key size={16} aria-hidden />
            {busy ? "Creating token" : "Create token"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function RevokeTokenDialog({ token, onClose, onRevoked }: { token: ApiTokenRow | null; onClose: () => void; onRevoked: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [token]);

  const revoke = async () => {
    if (!token || busy) return;
    setBusy(true);
    const res = await revokeToken(token.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    onRevoked(token.id);
    notifySuccess("Token revoked", { description: `${token.name} no longer works.` });
    onClose();
  };

  return (
    <Dialog
      open={!!token}
      onClose={onClose}
      busy={busy}
      tone="danger"
      title="Revoke token"
      description={token ? `Tools using "${token.name}" stop working on their next request. A revoked token cannot be turned back on.` : undefined}
    >
      {error ? <FieldMsg id="revoke-msg" error={error} /> : null}
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={() => void revoke()} disabled={busy} aria-busy={busy}>
          {busy ? "Revoking token" : "Revoke token"}
        </Button>
      </div>
    </Dialog>
  );
}
