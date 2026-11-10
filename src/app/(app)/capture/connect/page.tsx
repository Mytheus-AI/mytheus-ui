import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { PageHead } from "@/components/app/PageHead";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { captureConfig, captureConfigured } from "@/app/api/capture/_lib/config";
import { ConnectExtension } from "./ConnectExtension";

export const metadata: Metadata = { title: "Connect Mytheus Capture | Mytheus" };
export const dynamic = "force-dynamic";

/* Opened by the extension (`/capture/connect?ext=<extension id>`) to connect it to the signed-in
   account. The middleware has already sent a signed-out visitor through sign-in and back. */
export default async function ConnectCapturePage({
  searchParams,
}: {
  searchParams: { ext?: string | string[] };
}) {
  const config = captureConfig();
  const ext = typeof searchParams.ext === "string" ? searchParams.ext : "";
  const known = /^[a-p]{32}$/.test(ext) && config.extensionIds.includes(ext);
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead
        title="Connect Mytheus Capture"
        context="Let the Chrome extension bring your calls on Google Meet, Microsoft Teams and Zoom into this workspace."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
        <Card className="p-6 sm:p-7">
          {!captureConfigured(config) ? (
            <div className="flex flex-col gap-3">
              <h2 className="display text-[22px] text-ink">Capture is not switched on yet</h2>
              <p className="text-[15px] leading-relaxed text-ink-2">
                This Mytheus deployment has no capture service connected, so the extension cannot start a capture.
                Ask your Mytheus admin to turn it on.
              </p>
            </div>
          ) : !known ? (
            <div className="flex flex-col gap-3">
              <h2 className="display text-[22px] text-ink">Open this page from the extension</h2>
              <p className="text-[15px] leading-relaxed text-ink-2">
                Click the Mytheus icon in Chrome&apos;s toolbar and choose Connect your Mytheus account. If you do not
                have the extension yet, get it from the Capture page.
              </p>
              <div>
                <LinkButton href="/capture">Get the extension</LinkButton>
              </div>
            </div>
          ) : (
            <ConnectExtension extensionId={ext} />
          )}
        </Card>
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink-3">Signed in as</h2>
          <p className="mt-1.5 break-words text-[17px] font-semibold text-ink">{email || "You"}</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-3">
            Captures you start appear in Meetings under this account and workspace, with their notes, decisions and
            minutes. Disconnect any time from the extension, or sign out of Mytheus.
          </p>
        </Card>
      </div>
    </div>
  );
}
