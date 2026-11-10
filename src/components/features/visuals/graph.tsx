import type { ReactNode } from "react";
import { ArrowsClockwise, CalendarBlank, CheckSquare, Hash, User } from "@phosphor-icons/react/dist/ssr";
import { Chip, Win, WinBar } from "@/components/site/Section";
import { Demo, PanelLabel } from "@/components/features/atoms";

/* Knowledge graph: one confirmed decision and what it is connected to, drawn as a small graph and
   listed as aligned rows beside it. When the window scrolls in, the coral line draws its lineage:
   the decision it replaced, the decision, and the work it started. Nodes are HTML over an SVG of
   hairline edges, so labels stay readable at every width. */

type Node = { x: number; y: number; label: string; fill: string; mark: ReactNode };

const NODES: Node[] = [
  { x: 18, y: 22, label: "Q3 planning", fill: "bg-tint-ochre", mark: <CalendarBlank size={20} /> },
  { x: 82, y: 22, label: "Sarah", fill: "bg-tint-peach", mark: <span className="font-display text-[1.2rem] font-medium">S</span> },
  { x: 50, y: 11, label: "Pricing", fill: "bg-tint-sky", mark: <Hash size={20} /> },
  { x: 18, y: 80, label: "Earlier: $39", fill: "bg-bg-2", mark: <ArrowsClockwise size={20} /> },
  { x: 82, y: 80, label: "Page rework", fill: "bg-tint-sage", mark: <CheckSquare size={20} /> },
];
const CENTER = { x: 50, y: 52 };

const LINKS: { icon: ReactNode; kind: string; value: string }[] = [
  { icon: <CalendarBlank size={18} />, kind: "Made in", value: "Q3 planning, Jun 12" },
  { icon: <User size={18} />, kind: "Owner", value: "Sarah" },
  { icon: <CheckSquare size={18} />, kind: "Started", value: "Rework the pricing page" },
  { icon: <ArrowsClockwise size={18} />, kind: "Replaced", value: "Hold pricing at $39, Q2 planning" },
  { icon: <Hash size={18} />, kind: "Topic", value: "Pricing" },
];

/* viewBox is 400 x 300 and stretched to the box, so percentages map to user units directly */
const px = (x: number) => x * 4;
const py = (y: number) => y * 3;

export function GraphVisual() {
  return (
    <Win
      className="mx-auto max-w-[960px]"
      label="The knowledge graph around one confirmed decision, pricing locked at $49. It connects to the meeting where it was made, Q3 planning on June 12; its owner, Sarah; the work it started, the pricing page rework; the decision it replaced, holding pricing at $39 in Q2 planning; and its topic, pricing."
    >
      <WinBar title="Pricing locked at $49" meta="Decision, confirmed Jun 12" right={<Chip tone="accent">Decision</Chip>} />
      <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <Demo className="px-[22px] py-6">
          <div className="relative mx-auto aspect-[4/3] max-w-[460px]">
            <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <g stroke="var(--line-2)" strokeWidth={1.5} fill="none">
                {NODES.map((n) => (
                  <line key={n.label} x1={px(CENTER.x)} y1={py(CENTER.y)} x2={px(n.x)} y2={py(n.y)} vectorEffect="non-scaling-stroke" />
                ))}
                <line x1={px(82)} y1={py(22)} x2={px(82)} y2={py(80)} strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
              </g>
              <path
                className="line-stroke line-draw"
                pathLength={1}
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 2.6, ["--du" as string]: "1.3s", ["--dl" as string]: ".3s" }}
                d={`M${px(18)} ${py(80)} L${px(CENTER.x)} ${py(CENTER.y)} L${px(82)} ${py(80)}`}
              />
            </svg>
            <span
              className="absolute grid -translate-x-1/2 -translate-y-1/2 justify-items-center"
              style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
            >
              <span className="grid h-[60px] w-[60px] place-items-center rounded-full border-2 border-signal-line bg-signal-soft font-display text-[1.3rem] font-semibold text-signal-ink shadow-[0_0_0_6px_var(--surface)]">
                $49
              </span>
            </span>
            {NODES.map((n) => (
              <span
                key={n.label}
                className="absolute grid w-[104px] -translate-x-1/2 -translate-y-[22px] justify-items-center gap-1"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
              >
                <span className={`grid h-11 w-11 place-items-center rounded-full text-ink shadow-[0_0_0_5px_var(--surface)] ${n.fill}`}>
                  {n.mark}
                </span>
                <span className="whitespace-nowrap rounded-full bg-surface px-1.5 text-[13px] font-semibold text-ink-2">{n.label}</span>
              </span>
            ))}
          </div>
        </Demo>
        <div className="border-t border-line bg-surface-2 px-[22px] py-6 md:border-l md:border-t-0">
          <PanelLabel>Connected to</PanelLabel>
          <ul>
            {LINKS.map((l) => (
              <li key={l.kind} className="grid grid-cols-[34px_76px_minmax(0,1fr)] items-center gap-x-3 border-t border-line py-2.5 first:border-t-0">
                <span aria-hidden className="grid h-[34px] w-[34px] place-items-center rounded-ctl bg-surface text-ink-3 shadow-warm-1">
                  {l.icon}
                </span>
                <span className="text-[14px] text-ink-3">{l.kind}</span>
                <span className="text-[15px] font-medium leading-[1.35] text-ink">{l.value}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-ink-3">Built only from confirmed decisions and actions.</p>
        </div>
      </div>
    </Win>
  );
}
