import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";

/* The transcript's title row: the way back to the meeting, the meeting title in the display serif
   and one line of context. No hooks, so the RSC page can render it for the empty state and the
   client reader can render it too. */
export function TranscriptHead({ title, meta, backHref }: { title: string; meta: string; backHref: string }) {
  return (
    <>
      <Link href={backHref} className="mx-back">
        <ArrowLeft size={16} weight="bold" aria-hidden />
        Back to meeting
      </Link>
      <header className="mx-head">
        <div className="mx-head-main">
          <h1 className="mx-title">{title}</h1>
          <p className="mx-sub">{meta}</p>
        </div>
      </header>
    </>
  );
}
