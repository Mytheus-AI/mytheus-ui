import { Robot } from "@phosphor-icons/react/ssr";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { fetchDelegatedAnswers } from "@/lib/api/delegated-answers";
import { resolveOrgContext } from "@/lib/api/org-context";
import { uncoveredAnswer } from "@/lib/delegated-answers";
import { PreApprovedAnswersEditor } from "./PreApprovedAnswersEditor";

/* "Pre-approved answers" on a meeting's page, under "Can't make it?" (only-Mytheus wave, contract
   section 2). When you send your Myte, it answers questions in the room only from statements you
   approved here; anything else gets "{First name} didn't pre-approve an answer to that." Before
   you decide, a short line says this exists. Server component: reads your statements and your
   name, then hands plain data to the editor. The page refreshes after "Send my Myte", so this
   follows the choice without a reload. */

export async function PreApprovedAnswers({ meetingId }: { meetingId: string }) {
  const [read, org] = await Promise.all([
    fetchDelegatedAnswers(meetingId).then(
      (data) => ({ ok: true as const, data }),
      () => ({ ok: false as const }),
    ),
    resolveOrgContext(),
  ]);
  const name = org?.user.name ?? "";

  if (!read.ok) {
    return (
      <Card flush as="section" aria-labelledby="pre-approved-h">
        <CardHead id="pre-approved-h" title="Pre-approved answers" />
        <ErrorState
          variant="inline"
          title="Your pre-approved answers did not load"
          text="Nothing was lost. Your Myte still attends; it answers only from statements you saved."
        />
      </Card>
    );
  }

  if (read.data.attendance !== "agent") {
    return (
      <Card as="section" tone="well" aria-labelledby="pre-approved-h" className="!py-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-surface text-ink-2">
            <Robot size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="pre-approved-h" className="text-[15px] font-semibold text-ink">
              Pre-approved answers
            </h2>
            <p className="mt-0.5 max-w-[60ch] text-[14px] leading-relaxed text-ink-3">
              If you send your Myte, you can give it up to {read.data.max_statements} statements it may answer from. Anything
              else gets: &ldquo;{uncoveredAnswer(name)}&rdquo;
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card flush as="section" aria-labelledby="pre-approved-h">
      <CardHead
        id="pre-approved-h"
        title="Pre-approved answers"
        caption="What your Myte may say for you"
      />
      <CardBody>
        <PreApprovedAnswersEditor
          meetingId={meetingId}
          initial={read.data.statements.slice().sort((a, b) => a.position - b.position).map((s) => s.text)}
          editable={read.data.editable}
          limits={{ statementsMax: read.data.max_statements || 10, charsMax: read.data.max_chars || 300 }}
          personName={name}
        />
      </CardBody>
    </Card>
  );
}
