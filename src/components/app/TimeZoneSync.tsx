"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE, browserTimeZone } from "@/lib/timezone";

/* Keeps the `mytheus_tz` cookie equal to this browser's time zone, so server-rendered times use
   it. When the cookie was missing or stale (first visit, travel, a changed OS setting) the page
   re-renders once with the right zone. Renders nothing. */
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    const zone = browserTimeZone();
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${TZ_COOKIE}=`))
      ?.slice(TZ_COOKIE.length + 1);
    if (current && decodeURIComponent(current) === zone) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax; secure`;
    router.refresh();
  }, [router]);
  return null;
}
