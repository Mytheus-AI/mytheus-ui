"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, PlugsConnected, WarningCircle } from "@phosphor-icons/react";

import { Button, LinkButton } from "@/components/ui/Button";
import { createCaptureLink } from "../actions";

/* The page side of connecting Mytheus Capture: check the extension is installed (it answers a
   ping only to this origin), mint the link on click, and hand it over with
   `chrome.runtime.sendMessage`. Nothing is sent before the user clicks. */

type ExtensionApi = {
  runtime?: {
    sendMessage?: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void;
    lastError?: { message?: string };
  };
};

type Phase = "checking" | "missing" | "ready" | "connecting" | "connected" | "failed";

function send(extensionId: string, message: unknown): Promise<{ ok?: boolean } | null> {
  const chromeApi = (window as unknown as { chrome?: ExtensionApi }).chrome;
  const sendMessage = chromeApi?.runtime?.sendMessage;
  if (!sendMessage) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), 2500);
    try {
      sendMessage(extensionId, message, (response) => {
        window.clearTimeout(timer);
        // Reading lastError marks it handled; a missing extension lands here.
        const failed = Boolean(chromeApi?.runtime?.lastError);
        resolve(failed ? null : ((response as { ok?: boolean } | undefined) ?? null));
      });
    } catch {
      window.clearTimeout(timer);
      resolve(null);
    }
  });
}

const FAILURES: Record<string, string> = {
  AUTH_REQUIRED: "Your session ended. Sign in again, then connect.",
  CAPTURE_NOT_CONFIGURED: "Capture is not switched on for this workspace yet.",
  EXTENSION_NOT_ALLOWED: "This copy of the extension is not one Mytheus recognises. Download it from the Capture page.",
};

export function ConnectExtension({ extensionId }: { extensionId: string }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [message, setMessage] = useState<string | null>(null);

  const check = useCallback(async () => {
    setPhase("checking");
    const pong = await send(extensionId, { type: "mytheus.capture.ping" });
    setPhase(pong?.ok ? "ready" : "missing");
  }, [extensionId]);

  useEffect(() => {
    void check();
  }, [check]);

  async function connect() {
    setPhase("connecting");
    setMessage(null);
    const link = await createCaptureLink(extensionId);
    if (!link.ok) {
      setMessage(FAILURES[link.code] ?? "Mytheus could not connect the extension.");
      setPhase("failed");
      return;
    }
    const reply = await send(extensionId, {
      type: "mytheus.capture.link",
      token: link.token,
      expiresAt: link.expiresAt,
      account: link.account,
    });
    if (reply?.ok) {
      setPhase("connected");
    } else {
      setMessage("The extension did not answer. Make sure Mytheus Capture is installed and turned on, then try again.");
      setPhase("failed");
    }
  }

  if (phase === "connected") {
    return (
      <div role="status" className="flex flex-col gap-4">
        <p className="flex items-center gap-2.5 text-[17px] font-semibold text-ok">
          <CheckCircle size={22} weight="fill" aria-hidden />
          Mytheus Capture is connected
        </p>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Go back to your call, click the Mytheus icon in Chrome&apos;s toolbar and choose Start transcribing. You
          can close this tab.
        </p>
        <div>
          <LinkButton href="/capture" variant="outline">
            See captured calls
          </LinkButton>
        </div>
      </div>
    );
  }

  if (phase === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2.5 text-[16px] font-semibold text-priority-medium">
          <WarningCircle size={22} aria-hidden />
          Mytheus Capture is not installed in this browser
        </p>
        <p className="text-[15px] leading-relaxed text-ink-2">
          Install it from the Capture page, then open this page again from the extension&apos;s Connect button.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <LinkButton href="/capture">Get the extension</LinkButton>
          <Button variant="outline" onClick={() => void check()}>
            Check again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-ink-2">
        Connecting lets the extension start captures as you, in this workspace. It holds a link to your current
        sign-in, never your password, and stops working when you sign out of Mytheus.
      </p>
      {message ? (
        <p role="alert" className="rounded-ctl bg-priority-high-soft px-4 py-3 text-[14.5px] text-priority-high">
          {message}
        </p>
      ) : null}
      <div>
        <Button onClick={() => void connect()} disabled={phase !== "ready" && phase !== "failed"} aria-busy={phase === "connecting"}>
          <PlugsConnected size={18} aria-hidden />
          {phase === "connecting" ? "Connecting" : phase === "checking" ? "Looking for the extension" : "Connect Mytheus Capture"}
        </Button>
      </div>
    </div>
  );
}
