import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { Chip, Win, WinBar } from "@/components/site/Section";
import { Av, Ctl, Demo, SWAP_IN, SWAP_OUT, Swap, dl, type Tint } from "@/components/features/atoms";

/* Action items: one aligned list of tasks with owner, due date and the meeting each came from.
   The newest one was volunteered in the room and waits for a confirm; when the window scrolls in,
   the confirm is taken and it becomes a task like the others. */

const ROWS: { task: string; quote?: string; owner: string; tint: Tint; due: string; from: string; pending?: boolean }[] = [
  {
    task: "Book QA for two extra days after the freeze",
    quote: "“I'll own booking QA.”",
    owner: "Raj",
    tint: "sky",
    due: "Jul 4",
    from: "Launch sync",
    pending: true,
  },
  { task: "Draft the pricing rework scope", owner: "Sarah", tint: "peach", due: "Jul 10", from: "Q3 planning" },
  { task: "Send the updated deck to sales", owner: "Maya", tint: "ochre", due: "Jul 7", from: "GTM sync" },
];

const COLS = "lg:grid-cols-[minmax(0,1fr)_110px_64px_120px_164px]";

export function TasksVisual() {
  return (
    <Win
      className="mx-auto max-w-[980px]"
      label="Your tasks from three meetings. Raj volunteered to book QA for two extra days, due July 4, from the launch sync; you confirm it and it becomes an assigned task. Sarah drafts the pricing rework scope by July 10, Maya sends the updated deck to sales by July 7."
    >
      <WinBar title="Your tasks" meta="From 3 meetings this week" right={<Chip tone="medium">1 waiting for confirm</Chip>} />
      <Demo>
        <div className={`hidden gap-4 border-b border-line bg-surface-2 px-[22px] py-2.5 text-[14px] font-semibold text-ink-3 lg:grid ${COLS}`}>
          <span>Task</span>
          <span>Owner</span>
          <span>Due</span>
          <span>From</span>
          <span>Status</span>
        </div>
        <ul>
          {ROWS.map((r) => (
            <li
              key={r.task}
              className={`grid grid-cols-[minmax(0,1fr)] items-center gap-x-4 gap-y-2 border-b border-line px-[22px] py-4 last:border-b-0 ${COLS}`}
            >
              <div className="min-w-0">
                <p className="font-medium leading-[1.35] text-ink">{r.task}</p>
                {r.quote ? <p className="mt-0.5 font-display text-[1.05rem] italic text-ink-3">{r.quote}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:contents">
                <span className="flex items-center gap-2 text-[15px] text-ink-2">
                  <Av name={r.owner} tint={r.tint} size={26} />
                  {r.owner}
                </span>
                <span className="text-[15px] tabular-nums text-ink-2">
                  <span className="lg:hidden">Due </span>
                  {r.due}
                </span>
                <span className="text-[15px] text-ink-3">{r.from}</span>
                {r.pending ? (
                  <Swap className="items-center">
                    <span style={dl(1.5)} className={`flex items-center gap-2 ${SWAP_OUT}`}>
                      <Ctl>Confirm</Ctl>
                      <Ctl kind="ghost">Edit</Ctl>
                    </span>
                    <span style={dl(1.5)} className={SWAP_IN}>
                      <Chip tone="ok">Assigned to Raj</Chip>
                    </span>
                  </Swap>
                ) : (
                  <span>
                    <Chip tone="ok">Assigned</Chip>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Demo>
      <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-surface-2 px-[22px] py-3.5 text-[14px] text-ink-3">
        <ArrowsClockwise size={17} aria-hidden className="flex-none" />
        Open items come back at the start of Friday standup.
      </div>
    </Win>
  );
}
