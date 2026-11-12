"use client";

import { useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChatCircleText, Robot, SignIn, X } from "@phosphor-icons/react";
import { useListenSocket } from "@/lib/realtime/useListenSocket";
import { notifyInfo } from "@/lib/toast";
import { dismissInterruption } from "@/app/actions/listening";
import type { Interruption, MeetingView } from "@/lib/api/listening-types";
import { REASON_LABEL, SeenIds, parseInterruption } from "@/lib/listening";
import { useInterruptionResponses } from "./responses";

/* Live interruptions, app-wide (mounted once in the app layout; the call room has its own
   socket and is not under it). While a meeting you are not in is live and your Myte listens to
   it for you, the agent interrupts you only when something there needs you: a decision on your
   topics or what you own, a question for you, a promise made on your behalf. It arrives as one
   toast with three answers (Join now, Send a view, Let my Myte hold the line) and is also in
   your Inbox, so closing the toast loses nothing. Quiet hours, focus blocks and the hourly limit
   are applied on the server: what is held never reaches this socket.

   One toast per interruption, ever, in this tab (`SeenIds`): a reconnect or a duplicate delivery
   does not show it twice. On the Inbox the list refreshes so the new row appears in place. */

const TOAST_MS = 90_000;

export function LiveInterruptions() {
  const { getToken, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const seen = useRef(new SeenIds());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const responses = useInterruptionResponses((id) => toast.dismiss(id));

  const onInterrupt = useCallback(
    (raw: unknown) => {
      const i = parseInterruption(raw);
      if (!i || !seen.current.first(i.id)) return;
      toast.custom(
        (t) => (
          <InterruptionToast
            interruption={i}
            onJoin={() => void responses.join(i)}
            onView={() => {
              toast.dismiss(t);
              responses.openView(i);
            }}
            onHold={() => {
              toast.dismiss(t);
              responses.openHold(i);
            }}
            onDismiss={() => {
              toast.dismiss(t);
              void dismissInterruption(i.id);
            }}
          />
        ),
        { id: i.id, duration: TOAST_MS },
      );
      if (pathRef.current?.startsWith("/inbox") || pathRef.current?.startsWith("/meetings/listening")) router.refresh();
    },
    [responses, router],
  );

  const onViewStatus = useCallback((raw: unknown) => {
    const v = raw as Partial<MeetingView> | null;
    if (!v || typeof v.id !== "string" || (v.status !== "shared" && v.status !== "dismissed")) return;
    if (!seen.current.first(`view:${v.id}:${v.status}`)) return;
    const what = v.kind === "hold_line" ? "the line your Myte is holding" : "your view";
    notifyInfo(v.status === "shared" ? `The host shared ${what} with the room` : `The host set ${what} aside`);
  }, []);

  useListenSocket({ getToken, onInterrupt, onViewStatus, enabled: Boolean(isSignedIn) });

  return <>{responses.dialogs}</>;
}

export function InterruptionToast({
  interruption: i,
  onJoin,
  onView,
  onHold,
  onDismiss,
}: {
  interruption: Interruption;
  onJoin: () => void;
  onView: () => void;
  onHold: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="w-full min-w-0" role="group" aria-label={`Your Myte: ${i.title}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-priority-high-soft text-priority-high">
          <Robot size={18} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-ink-3">
            {REASON_LABEL[i.reason]}, in {i.meeting_title}
          </p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug text-ink">{i.title}</p>
          {i.quote ? (
            <p className="mt-1.5 line-clamp-2 font-display text-[14.5px] font-normal  leading-snug text-ink-2">&ldquo;{i.quote}&rdquo;</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Let it go"
          className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
        >
          <X size={15} weight="bold" aria-hidden />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 pl-12">
        <button
          type="button"
          onClick={onJoin}
          className="inline-flex h-9 items-center gap-1.5 rounded-ctl bg-pill px-3 text-[14px] font-semibold text-pill-on transition-colors hover:bg-pill-2"
        >
          <SignIn size={15} weight="bold" aria-hidden />
          Join now
        </button>
        <button
          type="button"
          onClick={onView}
          className="inline-flex h-9 items-center gap-1.5 rounded-ctl border border-line-2 bg-surface px-3 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <ChatCircleText size={15} aria-hidden />
          Send a view
        </button>
        <button
          type="button"
          onClick={onHold}
          className="inline-flex h-9 items-center gap-1.5 rounded-ctl border border-line-2 bg-surface px-3 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <Robot size={15} aria-hidden />
          Hold the line
        </button>
      </div>
    </div>
  );
}
