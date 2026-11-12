import Link from "next/link";
import { Moon } from "@phosphor-icons/react/ssr";
import { Chip } from "@/components/ui/Chip";
import type { EveningDigest } from "@/lib/api/listening-types";
import { dayLabel, digestSegments, savedLabel } from "@/lib/listening";

/* The evening digest: one paragraph per day about everything your Myte heard in the meetings it
   listened to for you, with each meeting and each decision a link to its moment. Server-safe (no
   hooks), so Home and the Listening page render it in the first paint. */

export function DigestParagraph({ digest, className = "" }: { digest: EveningDigest; className?: string }) {
  const parts = digestSegments(digest.paragraph);
  return (
    <p className={`max-w-[75ch] text-[16px] leading-[1.65] text-ink-2 ${className}`}>
      {parts.map((p, i) =>
        p.href ? (
          <Link key={i} href={p.href} className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px] hover:decoration-signal">
            {p.text}
          </Link>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </p>
  );
}

export function EveningDigestBody({ digest, showDay = true }: { digest: EveningDigest; showDay?: boolean }) {
  const listened = digest.meetings.filter((m) => m.choice === "agent_listens").length;
  return (
    <div>
      {showDay ? (
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink-3">
          <Moon size={15} aria-hidden />
          {dayLabel(digest.day)}
          {digest.id ? null : <Chip tone="outline">So far today</Chip>}
        </p>
      ) : null}
      <DigestParagraph digest={digest} className={showDay ? "mt-2" : ""} />
      {digest.status === "ready" && digest.meeting_count > 0 ? (
        <p className="mt-3 text-[13.5px] text-ink-3">
          {listened} covered by your Myte, {savedLabel(digest.minutes_saved)} back.
        </p>
      ) : null}
    </div>
  );
}
