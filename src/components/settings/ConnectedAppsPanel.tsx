"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Desktop, Globe, SealCheck } from "@phosphor-icons/react";
import { disconnectConnectedApp } from "@/app/actions/oauth";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldMsg } from "@/components/ui/Form";
import { notifyError, notifySuccess } from "@/lib/toast";
import { CONSENT_SCOPE, lastActivity, sortConnectedApps, type ConnectedAppRow } from "@/lib/oauth-consent";

/* Connected apps: the apps you approved with Mytheus sign-in (a Claude custom connector, for
   example), one row per connection. Each acts as you with the access you approved, refreshing its
   own short-lived token. Disconnect ends the connection at once (its tokens stop on the next
   request) and cannot be undone, so it asks first; connecting again starts from the app.

   A table from md up (app, access, connected, last used, disconnect) and labelled rows below. */

const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const fmt = (iso: string | null | undefined) => (iso && !Number.isNaN(Date.parse(iso)) ? date.format(new Date(iso)) : null);

export function ConnectedAppsPanel({ initial }: { initial: ConnectedAppRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => sortConnectedApps(initial));
  const [target, setTarget] = useState<ConnectedAppRow | null>(null);

  useEffect(() => setRows(sortConnectedApps(initial)), [initial]);

  return (
    <section aria-labelledby="connected-apps-heading" className={cardClass({ flush: true })}>
      <CardHead
        id="connected-apps-heading"
        as="h3"
        title="Connected apps"
        description="Apps you approved with Mytheus sign-in, such as Claude. Each acts as you, with the access you allowed and nothing more."
      />
      {rows.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            inCard
            art="line"
            title="No connected apps"
            description="Add Mytheus to Claude as a custom connector (see below), approve it, and it shows up here."
          />
        </div>
      ) : (
        <div className="border-t border-line">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_116px] gap-4 bg-surface-2 px-[22px] py-2.5 text-[12.5px] font-semibold text-ink-3 md:grid"
          >
            <span>App</span>
            <span>Access</span>
            <span>Connected</span>
            <span>Last used</span>
            <span className="sr-only">Disconnect</span>
          </div>
          <ul className="divide-y divide-line" aria-label="Your connected apps">
            {rows.map((a) => (
              <li
                key={a.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-[22px] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)_116px]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{a.client_name}</p>
                  <p className="flex min-w-0 items-center gap-1.5 text-[13px] text-ink-3">
                    {a.redirect_host === "localhost" || a.redirect_host === "127.0.0.1" || a.redirect_host === "::1" ? (
                      <Desktop size={14} className="shrink-0" aria-hidden />
                    ) : (
                      <Globe size={14} className="shrink-0" aria-hidden />
                    )}
                    <span className="truncate font-mono">{a.redirect_host}</span>
                    {a.verified_redirect ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-ok">
                        <SealCheck size={14} weight="fill" aria-hidden />
                        Verified
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                  <Chip tone={a.scope === "read_write" ? "accent" : "neutral"}>{CONSENT_SCOPE[a.scope].label}</Chip>
                </div>
                <p className="text-[14px] text-ink-2">
                  <span className="text-ink-3 md:hidden">Connected </span>
                  {fmt(a.connected_at)}
                </p>
                <p className="text-[14px] text-ink-2">
                  <span className="text-ink-3 md:hidden">Last used </span>
                  {fmt(lastActivity(a)) ?? "Not yet"}
                </p>
                <div className="col-span-2 flex md:col-span-1 md:justify-end">
                  <Button variant="danger-outline" size="sm" onClick={() => setTarget(a)} aria-label={`Disconnect ${a.client_name}`}>
                    Disconnect
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <DisconnectDialog
        app={target}
        onClose={() => setTarget(null)}
        onDone={(id) => {
          setRows((r) => r.filter((x) => x.id !== id));
          router.refresh();
        }}
      />
    </section>
  );
}

function DisconnectDialog({ app, onClose, onDone }: { app: ConnectedAppRow | null; onClose: () => void; onDone: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setError(null), [app]);

  const disconnect = async () => {
    if (!app || busy) return;
    setBusy(true);
    const res = await disconnectConnectedApp(app.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    onDone(app.id);
    notifySuccess("App disconnected", { description: `${app.client_name} no longer has access.` });
    onClose();
  };

  return (
    <Dialog
      open={!!app}
      onClose={onClose}
      busy={busy}
      tone="danger"
      title="Disconnect app"
      description={app ? `${app.client_name} loses access on its next request. To use it again, connect it again from the app.` : undefined}
    >
      {error ? <FieldMsg id="disconnect-msg" error={error} /> : null}
      <div className="mt-2 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={() => void disconnect()} disabled={busy} aria-busy={busy}>
          {busy ? "Disconnecting app" : "Disconnect app"}
        </Button>
      </div>
    </Dialog>
  );
}
