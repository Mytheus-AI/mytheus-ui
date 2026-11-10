import { HandPalm, Lock, Microphone, MonitorArrowUp, PhoneX, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { APPEAR, AgentAv, Av, Avs, Demo, PanelLabel, TINT, dl, type Tint } from "@/components/features/atoms";

/* Personal agent: the meeting room with no bot tile in the grid, and beside it your own agent's
   panel, tuned to your role (here, the engineering lead). When it scrolls in, one more note
   arrives for you. */

const TILES: { name: string; tint: Tint; speaking?: boolean; you?: boolean }[] = [
  { name: "Maya", tint: "peach", speaking: true },
  { name: "Priya", tint: "sage" },
  { name: "Diego", tint: "ochre" },
  { name: "Yash", tint: "sky", you: true },
];

export function AgentVisual() {
  return (
    <Win
      className="mx-auto max-w-[1000px]"
      label="A live Friday standup with four people and no bot in the grid. Beside it, your agent's private panel, tuned to your role as engineering lead, notes a proposed launch date and that your team needs two days after the code freeze."
    >
      <WinBar
        title="Friday standup"
        meta={<Live>Live, 09:32</Live>}
        right={
          <Avs>
            <Av name="Maya" />
            <Av name="Priya" tint="sage" />
            <Av name="Diego" tint="ochre" />
            <Av name="Yash" tint="sky" />
          </Avs>
        }
      />
      <div className="grid md:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-3.5 p-3 sm:p-[18px]">
          <div className="grid grid-cols-2 gap-2.5">
            {TILES.map((t) => (
              <div
                key={t.name}
                className={`relative grid aspect-[16/10] place-items-center rounded-[14px] bg-bg-2 ${t.speaking ? "shadow-[0_0_0_2.5px_var(--signal-line)]" : ""}`}
              >
                <span className={`grid aspect-square w-[32%] place-items-center rounded-full font-display text-[clamp(1.2rem,2.6vw,2rem)] font-medium text-ink ${TINT[t.tint]}`}>
                  {t.name.slice(0, 1)}
                </span>
                <span className="absolute bottom-2 left-2 rounded-full bg-surface px-2.5 py-0.5 text-[13px] font-semibold text-ink sm:bottom-2.5 sm:left-2.5">
                  {t.you ? "You" : t.name}
                </span>
              </div>
            ))}
          </div>
          <p className="rounded-[14px] border border-line bg-surface-2 px-4 py-3 text-[1rem] leading-[1.4] text-ink">
            <b className="mr-2 font-semibold">Maya</b>Let&rsquo;s target August 12. Can QA live with that?
          </p>
          <div className="hidden justify-self-center rounded-full bg-pill p-1.5 text-pill-on sm:flex sm:gap-1.5" aria-hidden>
            {[Microphone, VideoCamera, MonitorArrowUp, HandPalm].map((I, i) => (
              <span key={i} className="grid h-10 w-10 place-items-center rounded-full bg-pill-2">
                <I size={19} />
              </span>
            ))}
            <span className="grid h-10 w-[58px] place-items-center rounded-full bg-priority-high">
              <PhoneX size={19} />
            </span>
          </div>
        </div>

        <Demo className="grid content-start gap-3 border-t border-line bg-surface-2 p-3.5 sm:p-[18px] md:border-l md:border-t-0">
          <div className="flex items-center gap-2.5 font-semibold text-ink">
            <AgentAv />
            Your agent
            <Chip className="ml-auto">Listening</Chip>
          </div>
          <p className="-mt-1 text-[14px] text-ink-3">Tuned to your role: engineering lead</p>
          <PanelLabel className="!mb-0 mt-1">For you, this meeting</PanelLabel>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
            <Chip tone="accent">Decision</Chip>
            <p className="mt-2 font-semibold leading-[1.35] text-ink">Launch targeted for August 12.</p>
            <p className="mt-1 text-[14px] text-ink-3">Proposed by Maya. Waiting for your confirm.</p>
          </div>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
            <Chip tone="medium">Your team</Chip>
            <p className="mt-2 font-semibold leading-[1.35] text-ink">QA needs two more days after the code freeze.</p>
          </div>
          <div style={dl(1.1)} className={`rounded-[14px] border border-line bg-surface px-4 py-3.5 ${APPEAR}`}>
            <Chip tone="low">Context</Chip>
            <p className="mt-2 font-semibold leading-[1.35] text-ink">The freeze is set for August 8, from Tuesday&rsquo;s sprint review.</p>
          </div>
          <p className="flex items-center gap-2 pt-1 text-[14px] text-ink-3">
            <Lock size={16} aria-hidden className="flex-none" />
            Private to you. Share a note when you choose.
          </p>
        </Demo>
      </div>
    </Win>
  );
}
