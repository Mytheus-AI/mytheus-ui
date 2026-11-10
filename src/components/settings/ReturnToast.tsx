"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { notifySuccess } from "@/lib/toast";

/* After an OAuth round trip the server lands back here with `?connected=` (or `?disconnected=`). That is
   answered once, as a toast ("Google Calendar connected"), and the query is dropped from the
   address so a reload does not say it again. */
export function ReturnToast({ message }: { message: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // "Slack is connected." answers the Connect button as "Slack connected".
    notifySuccess(message.replace(/ is (connected|disconnected)\.?$/, " $1").replace(/\.$/, ""));
    router.replace(pathname ?? "/settings/integrations", { scroll: false });
  }, [message, pathname, router]);
  return null;
}
