"use client";

import type { ReactNode } from "react";
import { LockSimple } from "@phosphor-icons/react";
import { AuthCrowd, AuthRoom } from "@/components/auth/AuthRoom";
import { authFontClass } from "@/lib/fonts";
import { Bone, LoadingLabel, TextBone } from "@/components/ui/Page";
import "@/styles/auth.css";

/* An onboarding step while its server data loads, in the step's own frame: AuthShell's layout
   (its classes, the stage copy on the band and the peach panel with the doodle meeting, the
   footer) with the wordmark and the legal links as bones, since a skeleton holds nothing to
   focus; then the step header and the step's fields as bones at their real heights. The 400px
   column sits where the form will, so the form lands where the bones were. Keep it in step with
   components/auth/AuthShell.tsx. */

export function OnboardingLoading({
  label,
  stage,
  back = false,
  children,
}: {
  label: string;
  /** the step's stage copy, the same words the step passes AuthShell */
  stage: { title: string; lead?: string };
  /** the step opens with a back link */
  back?: boolean;
  children: ReactNode;
}) {
  return (
    <div aria-busy className={`mx-auth ${authFontClass} min-h-[100dvh] bg-surface lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]`}>
      <LoadingLabel label={label} />
      <div className="flex min-h-[100dvh] flex-col px-4 pb-5 pt-4 sm:px-8 lg:px-12 xl:px-16">
        <div aria-hidden className="flex min-h-[44px] items-center justify-between gap-4">
          <Bone className="h-[22px] w-[147px]" />
          <Bone className="h-[22px] w-14 sm:w-[200px]" />
        </div>
        <div aria-hidden className="auth-stage mt-4 rounded-card px-5 pb-3 pt-4 lg:hidden">
          <p className="display text-[19px] leading-snug">{stage.title}</p>
          <div className="mt-3">
            <AuthCrowd you="empty" />
          </div>
        </div>
        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-8 sm:py-12">
            {back ? <TextBone className="mb-6 text-[14px] font-semibold" widths={["w-40"]} /> : null}
            {children}
          </div>
        </div>
        <div aria-hidden className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4 text-[13px] text-ink-3">
          <span className="inline-flex items-center gap-2">
            <LockSimple size={15} />
            <TextBone widths={["w-40"]} />
          </span>
          <TextBone widths={["w-[171px]"]} />
        </div>
      </div>
      <div aria-hidden className="hidden p-3 lg:sticky lg:top-0 lg:block lg:h-[100dvh]">
        <div className="auth-stage flex h-full flex-col overflow-hidden rounded-hero px-8 pb-10 pt-8 xl:px-12 xl:pb-12">
          <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size] [@media(max-height:620px)]:hidden">
            <AuthRoom you="empty" />
          </div>
          <div className="mt-auto pt-6">
            <p className="display max-w-[15ch] text-[clamp(2.25rem,3.2vw,3.25rem)] leading-[1.02] [@media(max-height:820px)]:text-[2.25rem]">{stage.title}</p>
            {stage.lead ? (
              <p className="mt-4 max-w-[44ch] text-pretty text-[16px] leading-relaxed text-ink-2 [@media(max-height:760px)]:hidden">{stage.lead}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** StepHeader's skeleton: the kicker, the serif title and the lead (44ch). */
export function StepHeaderSkeleton({ title = "w-48", lead = ["w-full", "w-[70%]"] }: { title?: string; lead?: string[] }) {
  return (
    <div aria-hidden className="mb-7">
      <TextBone className="kicker mb-2" widths={["w-20"]} />
      <TextBone className="display text-[clamp(1.875rem,3.2vw,2.375rem)]" widths={[title]} />
      <TextBone className="mt-3 max-w-[44ch] text-[15.5px] leading-relaxed" widths={lead} />
    </div>
  );
}

/** A labelled field: the label row, the control (`h` sets its height) and the hint line. */
export function FieldSkeleton({ label = "w-28", h = "h-11", hint = true }: { label?: string; h?: string; hint?: boolean }) {
  return (
    <div aria-hidden>
      <TextBone className="mb-1.5 text-[14px] font-semibold" widths={[label]} />
      <Bone className={`w-full ${h}`} />
      {hint ? <TextBone className="mt-1.5 text-[13px] leading-snug" widths={["w-[70%]"]} /> : null}
    </div>
  );
}
