import type { ReactNode } from "react";

/* The title row every app page opens with: the serif title, one line of context, and the page's
   one primary action on the right. Below 640px the action drops under the title. Server
   component; the context line can be live text (pass `liveContext` when it changes as the user
   works, so screen readers hear the new count). */
export function PageHead({
  title,
  context,
  action,
  liveContext = false,
  children,
}: {
  title: ReactNode;
  context?: ReactNode;
  action?: ReactNode;
  liveContext?: boolean;
  /** extra lines under the context (a status notice, for example) */
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-2 sm:pb-7">
      <div className="min-w-0 flex-[1_1_320px]">
        <h1 className="display text-[clamp(28px,3vw,34px)] text-ink-display">{title}</h1>
        {context ? (
          <p
            className="mt-2 max-w-[62ch] text-[15px] leading-normal text-ink-3"
            aria-live={liveContext ? "polite" : undefined}
          >
            {context}
          </p>
        ) : null}
        {children}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div> : null}
    </header>
  );
}

/** A skeleton block. Pulses only when motion is allowed (`.mx-bone` in app-theme.css). */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`mx-bone block rounded-ctl bg-bg-2 ${className}`} />;
}
