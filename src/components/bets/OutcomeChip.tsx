import { CheckCircle, MinusCircle, XCircle } from "@phosphor-icons/react/ssr";
import { Chip } from "@/components/ui/Chip";
import { outcomeLabel } from "@/lib/bets";

/* A scored bet's outcome as a chip that never relies on colour alone: hit (green, a tick), partly
   (amber, a dash), missed (a quiet chip with a red cross; the red text on the red wash falls
   just short of AA at chip size, so the colour sits on the icon). */
export function OutcomeChip({ outcome, prefix = "" }: { outcome: string | null | undefined; prefix?: string }) {
  const label = outcomeLabel(outcome);
  if (!label) return null;
  const text = prefix ? `${prefix} ${label.toLowerCase()}` : label;
  if (outcome === "hit") return <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>{text}</Chip>;
  if (outcome === "partly") return <Chip tone="medium" icon={<MinusCircle size={14} weight="fill" />}>{text}</Chip>;
  return (
    <Chip tone="neutral" icon={<XCircle size={14} weight="fill" className="text-priority-high" />}>
      {text}
    </Chip>
  );
}
