import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { Av, Ctl, Demo, PanelLabel, SWAP_IN, SWAP_OUT, Swap, dl } from "@/components/features/atoms";

/* Decision tracking: what Maya said, the decision your Myte caught from it with Confirm, Edit and
   Dismiss, and the lineage it joins (one straight thread, a bead per decision). When it scrolls
   in, the confirm is taken: the controls give way to a "Confirmed by you" chip. */

const LINEAGE = [
  { when: "Apr 3", meeting: "Q2 planning", text: "Hold pricing at $39 until the research lands." },
  { when: "May 20", meeting: "Pricing review", text: "Research supports a $49 tier." },
  { when: "Today", meeting: "Q3 planning", text: "Pricing locked at $49 for Q3.", now: true },
];

export function DecisionVisual() {
  return (
    <Win
      className="mx-auto max-w-[960px]"
      label="Q3 planning, live. Maya says let's lock pricing at $49 for Q3. Your Myte labels it as a decision with Confirm, Edit and Dismiss, and you confirm it. It joins a lineage: held at $39 in Q2 planning on April 3, research supporting $49 on May 20, locked at $49 today."
    >
      <WinBar title="Q3 planning" meta={<Live>Live, 11:02</Live>} right={<Chip>1 decision caught</Chip>} />
      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <Demo className="px-[22px] py-6">
          <PanelLabel>Said in the room</PanelLabel>
          <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3">
            <Av name="Maya" />
            <p className="font-display text-[1.24rem] italic leading-[1.3] text-ink-2">
              &ldquo;Okay, let&rsquo;s lock pricing at $49 for Q3 and move on.&rdquo;
            </p>
          </div>
          <div className="mt-5 rounded-[14px] border border-line bg-surface-2 px-4 py-4 sm:px-5">
            <Chip tone="accent">Decision</Chip>
            <p className="mt-2.5 font-display text-[1.4rem] font-medium leading-[1.2] tracking-[-0.01em] text-ink">
              Pricing locked at $49 for Q3.
            </p>
            <p className="mt-1 text-[14px] text-ink-3">Owner: Maya. Follows from Pricing review, May 20.</p>
            <Swap className="mt-4 min-h-10 items-center">
              <span style={dl(1.6)} className={`flex flex-wrap items-center gap-2 ${SWAP_OUT}`}>
                <Ctl>Confirm</Ctl>
                <Ctl kind="outline">Edit</Ctl>
                <Ctl kind="ghost">Dismiss</Ctl>
              </span>
              <span style={dl(1.6)} className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${SWAP_IN}`}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-3 py-1 text-[14px] font-semibold text-ok">
                  <CheckCircle size={16} weight="bold" aria-hidden />
                  Confirmed by you
                </span>
                <span className="text-[14px] text-ink-3">Saved to the decision log.</span>
              </span>
            </Swap>
          </div>
        </Demo>

        <div className="border-t border-line bg-surface-2 px-[22px] py-6 md:border-l md:border-t-0">
          <PanelLabel>Lineage</PanelLabel>
          <ol>
            {LINEAGE.map((l, i) => (
              <li key={l.when} className="relative grid grid-cols-[13px_minmax(0,1fr)] gap-x-4 pb-5 last:pb-0">
                {i < LINEAGE.length - 1 ? (
                  <span aria-hidden className="absolute -bottom-3 left-[5.5px] top-3 w-0.5 rounded-full bg-line-2" />
                ) : null}
                <span
                  className={`relative z-[1] mt-[5px] h-[13px] w-[13px] rounded-full border-2 ${
                    l.now
                      ? "border-signal-line bg-signal-line shadow-[0_0_0_5px_var(--signal-soft)]"
                      : "border-line-2 bg-surface"
                  }`}
                />
                <div>
                  <p className="text-[14px] text-ink-3">
                    <span className="font-semibold text-ink-2">{l.meeting}</span>, {l.when}
                  </p>
                  <p className={`mt-0.5 leading-[1.4] ${l.now ? "font-semibold text-ink" : "text-ink-2"}`}>{l.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Win>
  );
}
