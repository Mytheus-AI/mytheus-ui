"use client";

import { useEffect, useState } from "react";

/* A date in the viewer's own time zone. The server renders it in UTC (it cannot know the
   viewer's zone); the browser re-renders it locally once mounted. */
export function LocalTime({
  iso,
  withTime = false,
  className,
}: {
  iso: string;
  withTime?: boolean;
  className?: string;
}) {
  const format = (timeZone?: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      ...(timeZone ? { timeZone } : {}),
    };
    return new Intl.DateTimeFormat("en-US", opts).format(d);
  };
  const [text, setText] = useState(() => format("UTC"));
  useEffect(() => setText(format()), [iso, withTime]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
