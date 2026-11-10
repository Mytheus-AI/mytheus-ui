"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle, Info, WarningCircle } from "@phosphor-icons/react";

/* The call's toast: one dark pill at the top centre (clear of the control bar and the chat
   composer). Only the latest message shows.

   Three tones, so the icon never says the opposite of the words (polish program, Phase 0: errors
   used to carry a green check). `success` confirms something you did ("Meeting link copied"),
   `error` says something did not happen and is announced assertively, `info` is everything else
   ("Raj confirmed a decision"). An error stays a little longer, since it usually asks for
   something. */

export type ToastTone = "success" | "error" | "info";
type Toast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<Toast>(() => {});

const DWELL_MS: Record<ToastTone, number> = { success: 2600, info: 3200, error: 5200 };

export function CallToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string; tone: ToastTone } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback<Toast>((text, tone = "info") => {
    window.clearTimeout(timer.current);
    setMessage({ id: Date.now(), text, tone });
    timer.current = window.setTimeout(() => setMessage(null), DWELL_MS[tone]);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const Icon = message?.tone === "error" ? WarningCircle : message?.tone === "success" ? CheckCircle : Info;

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Two live regions, so an error interrupts and a confirmation waits its turn. */}
      <div className="toast-host" role="status" aria-live="polite">
        {message && message.tone !== "error" ? (
          <div className={`toast is-${message.tone}`} key={message.id}>
            <Icon size={18} weight="fill" aria-hidden />
            {message.text}
          </div>
        ) : null}
      </div>
      <div className="toast-host" role="alert" aria-live="assertive">
        {message && message.tone === "error" ? (
          <div className="toast is-error" key={message.id}>
            <Icon size={18} weight="fill" aria-hidden />
            {message.text}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useCallToast(): Toast {
  return useContext(ToastContext);
}
