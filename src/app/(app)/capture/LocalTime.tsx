"use client";

import { useEffect, useState } from "react";

const OPTIONS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

/* A captured call's time in the viewer's own time zone. The server renders it in UTC so the
   first paint matches on both sides; the effect then switches to local time. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() =>
    new Intl.DateTimeFormat("en-GB", { ...OPTIONS, timeZone: "UTC", timeZoneName: "short" }).format(new Date(iso)),
  );
  useEffect(() => {
    setText(new Intl.DateTimeFormat(undefined, OPTIONS).format(new Date(iso)));
  }, [iso]);
  return <time dateTime={iso}>{text}</time>;
}
