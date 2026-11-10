import type { Metadata } from "next";
import { Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = { title: "Verify your student status | Mytheus" };

const STEPS = [
  "Enter your school email: .edu or your institution's address.",
  "Open the verification link we send to that inbox.",
  "Mytheus Pro unlocks, free for as long as you're enrolled.",
];

/* Student verification: what happens, plainly, beside the form on a peach stage. The form is
   the only client island. */
export default function Page() {
  return (
    <>
      <section className="pb-[clamp(64px,9vw,120px)] pt-[clamp(48px,6vw,88px)]">
        <Wrap>
          <div className="grid items-center gap-x-16 gap-y-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="kicker">Students</p>
              <h1 className="display mt-4 max-w-[12ch] text-[clamp(2.6rem,5.6vw,4.25rem)] leading-[1] tracking-[-0.03em]">
                Confirm you&apos;re a student.
              </h1>
              <p className="mt-6 max-w-[44ch] text-[clamp(1.08rem,1.5vw,1.22rem)] leading-relaxed text-ink-3">
                Enter your school email and we&apos;ll send a link to unlock Mytheus Pro, free for as long as you&apos;re
                enrolled.
              </p>
              <ol className="mt-8 max-w-[46ch] border-b border-line-2">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex gap-4 border-t border-line-2 py-4 text-[16px] leading-relaxed text-ink-2">
                    <span className="w-5 flex-none font-display text-[1.2rem] font-medium leading-[1.4] text-signal-ink">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
            <Stage glow className="!p-[clamp(12px,3.5vw,40px)]">
              <div className="rounded-card bg-surface p-6 shadow-warm-3 sm:p-8">
                <VerifyForm />
              </div>
            </Stage>
          </div>
        </Wrap>
      </section>

      <CloseCTA
        title="Free for as long as you're enrolled."
        lead="Renew your verification once each academic year to stay on Pro."
        ctaHref="/students"
        ctaLabel="Read the student offer"
        secondaryHref="/pricing"
        secondaryLabel="See what Pro includes"
        note={null}
      />
    </>
  );
}
