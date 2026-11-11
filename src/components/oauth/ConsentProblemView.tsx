import { LinkBreak } from "@phosphor-icons/react/ssr";
import { LinkButton } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { CONSENT_PROBLEM, type ConsentProblem } from "@/lib/oauth-consent";

/* Every way the consent page can end without a decision. A passing failure gets the house
   ErrorState with Retry (it re-runs the page's read); everything else is a calm explanation of
   what happened and what to do next in the app, because retrying here cannot fix it. Nothing was
   shared in any of these states, and the page never sends the browser to an address it could not
   trust. */
export function ConsentProblemView({ problem }: { problem: ConsentProblem }) {
  const copy = CONSENT_PROBLEM[problem];
  if (copy.retry) {
    return <ErrorState variant="page" title={copy.title} text={copy.text} action={<LinkButton href="/dashboard" variant="outline">Go to Mytheus</LinkButton>} />;
  }
  return (
    <section
      aria-labelledby="consent-problem-title"
      className="flex flex-col items-center rounded-card border border-line bg-surface px-6 py-14 text-center shadow-warm-1 sm:px-10 sm:py-16"
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-bg-2 text-ink-3" aria-hidden="true">
        <LinkBreak size={26} />
      </span>
      <h1 id="consent-problem-title" className="display mt-5 max-w-[30ch] text-[28px] leading-tight text-ink-display sm:text-[32px]">
        {copy.title}
      </h1>
      <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-ink-3">{copy.text}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <LinkButton href="/dashboard" variant="outline">
          Go to Mytheus
        </LinkButton>
        <LinkButton href="/settings/api" variant="ghost">
          Connection help
        </LinkButton>
      </div>
    </section>
  );
}
