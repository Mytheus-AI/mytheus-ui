"use client";

import { useState } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { PUSH_COMMAND, type SetupGuide } from "@/lib/integrations";

/* "Set up" for a provider the server has no app credentials for (admins only). It opens a dialog
   with everything needed to create the provider's app: what the integration does, where to
   create it, the exact redirect URL to paste (with Copy), the scopes, the env var names the
   server reads, and the one command the server operator runs. It never asks for or shows a
   credential value: those go from the operator's machine to the server, not through the browser. */

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
      <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-bg-2 text-[13px] font-semibold tabular-nums text-ink-2">
        {n}
      </span>
      <div className="min-w-0 pb-5">
        <h3 className="pt-0.5 text-[15px] font-semibold text-ink">{title}</h3>
        <div className="mt-2 flex flex-col gap-3 text-[14px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </li>
  );
}

function CopyRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-3">{label}</span>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <code className="min-w-0 flex-1 break-all rounded-ctl border border-line bg-surface-2 px-3 py-2 font-mono text-[13px] leading-snug text-ink">
          {value}
        </code>
        <CopyButton value={value} label="Copy" ariaLabel={copyLabel} />
      </div>
    </div>
  );
}

export function IntegrationSetup({
  name,
  guide,
  redirectUrl,
  apiOrigin,
}: {
  name: string;
  guide: SetupGuide;
  redirectUrl: string;
  apiOrigin: string;
}) {
  const [open, setOpen] = useState(false);
  const title = `Set up ${name}`;
  return (
    <>
      <Button type="button" variant="outline" size="sm" aria-haspopup="dialog" aria-label={title} onClick={() => setOpen(true)}>
        Set up
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        size="lg"
        description={`${name} needs an app of your own at the provider before anyone can connect it. This takes about five minutes.`}
      >
        <p className="mb-5 rounded-ctl bg-bg-2 px-3.5 py-3 text-[14px] leading-relaxed text-ink-2">{guide.does}</p>
        <ol className="flex flex-col">
          <Step n={1} title="Create the app">
            <a
              href={guide.console.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-fit items-center gap-1.5 font-semibold text-ink underline decoration-line-2 underline-offset-[3px] hover:decoration-ink-3"
            >
              Open {guide.console.label}
              <ArrowSquareOut size={15} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <ul className="list-disc pl-5 marker:text-ink-4">
              {guide.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </Step>
          <Step n={2} title="Paste the redirect URL">
            <CopyRow label="Redirect URL" value={redirectUrl} copyLabel="Copy redirect URL" />
            {guide.apiUrls?.map((u) => (
              <CopyRow key={u.path} label={u.label} value={`${apiOrigin}${u.path}`} copyLabel={`Copy ${u.label}`} />
            ))}
          </Step>
          <Step n={3} title={guide.scopes.length ? "Add these scopes" : "Scopes"}>
            {guide.scopes.length ? (
              <>
                <ul aria-label={`${name} scopes`} className="flex flex-wrap gap-1.5">
                  {guide.scopes.map((s) => (
                    <li key={s}>
                      <Chip className="font-mono !font-medium">{s}</Chip>
                    </li>
                  ))}
                </ul>
                <div>
                  <CopyButton value={guide.scopes.join(" ")} label="Copy scopes" ariaLabel={`Copy ${name} scopes`} />
                </div>
              </>
            ) : (
              <p>{guide.scopesNote}</p>
            )}
          </Step>
          <Step n={4} title="Give the keys to the server">
            <p>Put the app&apos;s values in the backend&apos;s environment file under these names:</p>
            <ul aria-label={`${name} environment variables`} className="flex flex-wrap gap-1.5">
              {guide.env.map((v) => (
                <li key={v}>
                  <code className="rounded-full bg-bg-2 px-2.5 py-[3px] font-mono text-[12.5px] text-ink-2">{v}</code>
                </li>
              ))}
            </ul>
            <p>
              Then ask your server operator to run <code className="rounded-full bg-bg-2 px-2 py-[2px] font-mono text-[13px] text-ink">{PUSH_COMMAND}</code> and
              redeploy the backend. Connect turns on here as soon as the server has the keys.
            </p>
          </Step>
        </ol>
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" variant="primary" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Dialog>
    </>
  );
}
