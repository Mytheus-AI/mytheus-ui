"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkle } from "@phosphor-icons/react";

/* The call's toast, ported from the meeting design's ToastContext: one dark pill at the bottom
   centre that confirms a local action ("Meeting link copied"). Only the latest message shows. */

type Toast = (message: string) => void;

const ToastContext = createContext<Toast>(() => {});

export function CallToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<{ id: number; text: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback<Toast>((text) => {
    window.clearTimeout(timer.current);
    setMessage({ id: Date.now(), text });
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-host" role="status" aria-live="polite">
        {message ? (
          <div className="toast" key={message.id}>
            <span className="spark" aria-hidden>
              <Sparkle size={13} weight="fill" />
            </span>
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
