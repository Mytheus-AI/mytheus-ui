import type { ReactNode } from "react";
import Link from "next/link";

/* The screen head from the meeting design (title, one meta line, actions on the right). No hooks,
   so the RSC page can render it for the empty state and the client reader can render it with
   the search field in `children`. */
export function TranscriptHead({
  title,
  meta,
  backHref,
  children,
}: {
  title: string;
  meta: string;
  backHref: string;
  children?: ReactNode;
}) {
  return (
    <div className="screen-head reveal">
      <div className="head-text">
        <h1>{title}</h1>
        <p>{meta}</p>
      </div>
      <div className="head-actions">
        {children}
        <Link href={backHref} className="btn-ghost-sm tap">
          Back to meeting
        </Link>
      </div>
    </div>
  );
}
