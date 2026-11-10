"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react";

/* The call's toast: one dark pill at the top centre (clear of the control bar and the chat
   composer) that confirms a local action ("Meeting link copied"). Only the latest message shows. */

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
            <CheckCircle size={18} weight="fill" aria-hidden />
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
