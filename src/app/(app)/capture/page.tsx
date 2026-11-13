import type { Metadata } from "next";
import Link from "next/link";
import { stat } from "node:fs/promises";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";

import { PageHead } from "@/components/app/PageHead";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { captureConfig, captureConfigured } from "@/app/api/capture/_lib/config";
import { CAPTURE_SOURCE_LABELS, parseCapturedTitle, type CaptureSource } from "@/app/api/capture/_lib/source";
import { listMeetings } from "@/lib/api/meetings";
import { LocalTime } from "./LocalTime";
import { WhatItRecords } from "./WhatItRecords";

export const metadata: Metadata = { title: "Capture | Mytheus" };
export const dynamic = "force-dynamic";

/* Mytheus Capture: what the Chrome extension is, how to install and connect it, and the calls it
   has brought in. Captured calls are ordinary core-api meetings whose title carries the source
   ("Google Meet: ..."), so they also appear in Meetings with their notes and minutes. A failed
   meetings read is shown as such, never as an empty list. */

interface CapturedCall {
  id: string;
  source: CaptureSource;
  title: string;
  at: string;
  status: string;
}

const STATUS: Record<string, { label: string; tone: "danger" | "success" | "default" }> = {
  live: { label: "Transcribing", tone: "danger" },
  ended: { label: "Done", tone: "success" },
  scheduled: { label: "Started", tone: "default" },
  cancelled: { label: "Cancelled", tone: "default" },
};

async function zipAvailable(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

const STEPS: { title: string; body: string }[] = [
  {
    title: "Download the extension",
    body: "Unzip it into a folder you will keep; Chrome loads it from there.",
  },
  {
    title: "Load it in Chrome",
    body: "Open chrome://extensions, switch on Developer mode, choose Load unpacked and pick the folder. Pin Mytheus Capture to the toolbar.",
  },
  {
    title: "Connect your account",
    body: "Click the Mytheus icon and choose Connect your Mytheus account. One click on the page that opens.",
  },
  {
    title: "Capture a call",
    body: "Join a call on Google Meet, Teams or the Zoom web client, click the icon, tell everyone, and start transcribing.",
  },
];

export default async function CapturePage() {
  const config = captureConfig();
  const [meetings, downloadable] = await Promise.all([listMeetings(), zipAvailable(config.zipPath)]);
  const configured = captureConfigured(config);

  const captured: CapturedCall[] | null =
    meetings === null
      ? null
      : meetings.flatMap((m) => {
          const parsed = parseCapturedTitle(m.title);
          if (!parsed) return [];
          return [{ id: m.id, source: parsed.source, title: parsed.title, at: m.scheduled_start ?? m.created_at, status: m.status }];
        });

  const download = downloadable ? (
    <a
      href="/api/capture/extension"
      download="mytheus-capture.zip"
      className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-ctl border border-pill bg-pill px-[18px] text-[15px] font-semibold leading-none text-pill-on transition-[background-color,box-shadow] duration-150 hover:bg-pill-2 hover:shadow-warm-2"
    >
      <DownloadSimple size={18} aria-hidden />
      Download for Chrome
    </a>
  ) : null;

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead
        title="Capture"
        context="Bring calls on Google Meet, Microsoft Teams and Zoom into Mytheus, with no bot joining. Your Myte, notes, decisions and minutes work on them like any Mytheus meeting."
        action={download}
      >
        {!configured ? (
          <p
            role="status"
            className="mt-4 max-w-[70ch] rounded-ctl bg-priority-medium-soft px-4 py-3 text-[14.5px] leading-relaxed text-ink"
          >
            Capture is not switched on for this deployment yet: the extension installs and connects, but cannot start
            a capture until the capture service is connected.
          </p>
        ) : null}
        {!downloadable ? (
          <p className="mt-3 max-w-[70ch] text-[14.5px] text-ink-3">
            This deployment does not carry a build of the extension. Build it from the <code className="font-mono text-[13.5px]">extension/</code> folder of mytheus-ui with <code className="font-mono text-[13.5px]">npm run build</code>.
          </p>
        ) : null}
      </PageHead>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
        <section aria-labelledby="captured-calls" className="min-w-0">
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3">
              <h2 id="captured-calls" className="text-[15px] font-semibold text-ink">
                Captured calls
              </h2>
              {captured && captured.length > 0 ? (
                <span className="text-[13.5px] text-ink-3">
                  {captured.length} {captured.length === 1 ? "call" : "calls"}
                </span>
              ) : null}
            </div>
            {captured === null ? (
              <p role="alert" className="px-5 py-8 text-[15px] leading-relaxed text-ink-2">
                Your captured calls did not load: the meetings service could not be reached. Nothing is lost; reload in a
                moment.
              </p>
            ) : captured.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No captured calls yet"
                  description="Calls you capture with the extension land here and in Meetings, with their transcript, notes and minutes."
                />
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {captured.map((call) => {
                  const status = STATUS[call.status] ?? STATUS.scheduled;
                  return (
                    <li key={call.id}>
                      <Link
                        href={`/meetings/${call.id}`}
                        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors duration-150 hover:bg-surface-2 focus-visible:bg-surface-2 sm:grid-cols-[150px_minmax(0,1fr)_auto_auto]"
                      >
                        <span className="text-[13.5px] font-semibold text-ink-3 sm:order-none">
                          {CAPTURE_SOURCE_LABELS[call.source]}
                        </span>
                        <span className="col-span-2 min-w-0 truncate text-[16px] font-semibold text-ink group-hover:underline sm:col-span-1">
                          {call.title}
                        </span>
                        <span className="text-[14px] text-ink-3">
                          <LocalTime iso={call.at} />
                        </span>
                        <Badge tone={status.tone} className="justify-self-end">
                          {status.label}
                        </Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <Card className="p-6">
            <h2 className="display text-[21px] text-ink">Set it up once</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <span
                    aria-hidden
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-soft text-[13.5px] font-semibold text-signal-ink"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{step.title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-ink-3">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 border-t border-line pt-4">
              <WhatItRecords />
            </div>
          </Card>

        </aside>
      </div>
    </div>
  );
}
