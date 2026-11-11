import { Bone } from "@/components/ui/Page";
import { FieldSkeleton, OnboardingLoading, StepHeaderSkeleton } from "@/components/onboarding/OnboardingLoading";

/* About you while the profile loads: the step's frame and copy, the step header, then the role,
   what you work on, the three topic fields and the button, at their real heights. */
export default function Loading() {
  return (
    <OnboardingLoading
      label="Loading your profile"
      stage={{
        title: "Your agent listens for your work.",
        lead: "An engineer and a PM leave the same meeting with different notes. Tell your agent what you do, and it keeps what matters to you.",
      }}
    >
      <StepHeaderSkeleton title="w-40" />
      <div className="space-y-5">
        <FieldSkeleton label="w-24" />
        <FieldSkeleton label="w-36" h="h-[122px]" />
        <FieldSkeleton label="w-32" h="h-[46px]" />
        <FieldSkeleton label="w-28" h="h-[46px]" />
        <FieldSkeleton label="w-20" h="h-[46px]" />
        <Bone className="h-[52px] w-full" />
      </div>
    </OnboardingLoading>
  );
}
