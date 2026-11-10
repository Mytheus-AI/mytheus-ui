import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { APPEAR, Av, Ctl, Demo, PanelLabel, dl, type Tint } from "@/components/features/atoms";

/* Smart questions: the conversation on the left, your private suggestions on the right, each
   wearing its frozen priority tone. When it scrolls in, the act-now suggestion arrives on top. */

const TALK: { name: string; tint: Tint; text: string }[] = [
  { name: "Maya", tint: "peach", text: "If pricing changes, the launch page copy has to change too." },
  { name: "Diego", tint: "ochre", text: "Legal has the new terms. We should be fine for the 12th." },
  { name: "Priya", tint: "sage", text: "Marketing drafts the announcement on Thursday." },
];

function Suggestion({ tone, kind, text }: { tone: "high" | "medium" | "low"; kind: string; text: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
      <Chip tone={tone}>{kind}</Chip>
      <p className="mt-2 font-medium leading-[1.4] text-ink">{text}</p>
      <div className="-ml-3.5 mt-1.5 flex items-center">
        <Ctl kind="ghost">Use</Ctl>
        <Ctl kind="ghost">Dismiss</Ctl>
      </div>
    </div>
  );
}

export function SuggestionsVisual() {
  return (
    <Win
      className="mx-auto max-w-[960px]"
      label="A live design review. While Diego says legal should be fine, your private sidebar suggests three questions: act now, has legal signed off on the new pricing terms; worth attention, should marketing see the change before Thursday; context, a pricing page change took three weeks last quarter."
    >
      <WinBar title="Launch review" meta={<Live>Live, 10:14</Live>} right={<Chip tone="accent">Private to you</Chip>} />
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="px-[22px] py-6">
          <PanelLabel>Transcript</PanelLabel>
          <ul>
            {TALK.map((t) => (
              <li key={t.text} className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 gap-y-0.5 py-2.5">
                <Av name={t.name} tint={t.tint} />
                <b className="self-center text-[15px] font-semibold text-ink">{t.name}</b>
                <p className="col-start-2 text-[1.04rem] leading-[1.45] text-ink-2">{t.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <Demo className="grid content-start gap-2.5 border-t border-line bg-surface-2 px-[18px] py-6 md:border-l md:border-t-0">
          <PanelLabel className="!mb-1">Suggested questions</PanelLabel>
          <div style={dl(0.9)} className={APPEAR}>
            <Suggestion tone="high" kind="Act now" text="Has legal signed off on the new pricing terms, or only reviewed them?" />
          </div>
          <Suggestion tone="medium" kind="Worth attention" text="Should marketing see the pricing change before Thursday's draft?" />
          <Suggestion tone="low" kind="Context" text="A pricing page change took three weeks last quarter. Is the 12th still realistic?" />
          <p className="pt-1 text-[14px] text-ink-3">2 lower-confidence suggestions logged quietly.</p>
        </Demo>
      </div>
    </Win>
  );
}
