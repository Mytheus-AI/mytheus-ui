import { Bone, TextBone } from "@/components/ui/Page";
import { FieldSkeleton, OnboardingLoading, StepHeaderSkeleton } from "@/components/onboarding/OnboardingLoading";

/* Meet your Myte while the profile loads: the step's frame and copy, the back link, the step
   header, the agent's preview card, then the name, its face, the five ways of writing, the
   instructions, the button and the skip line, at their real heights. */
export default function Loading() {
  return (
    <OnboardingLoading
      label="Loading your Myte"
      back
      stage={{
        title: "A face and a voice of its own.",
        lead: "Your Myte sits beside you in every meeting and writes your notes the way you like to read them.",
      }}
    >
      <StepHeaderSkeleton title="w-64" />
      <Bone className="mb-6 h-[300px] w-full !rounded-card sm:h-[269px]" />
      <div className="space-y-6">
        <FieldSkeleton label="w-12" />
        <div className="flex items-center gap-4">
          <Bone className="h-[72px] w-[72px] shrink-0 !rounded-full" />
          <div className="min-w-0 flex-1">
            <TextBone className="text-[13px] font-semibold" widths={["w-14"]} />
            <Bone className="mt-2 h-9 w-full" />
          </div>
        </div>
        <div>
          <TextBone className="mb-2 text-[14px] font-semibold" widths={["w-20"]} />
          <div className="space-y-2">
            {["h-[146px] sm:h-[122px]", "h-[104px] sm:h-[80px]", "h-[166px] sm:h-[142px]", "h-[124px] sm:h-[100px]", "h-[124px] sm:h-[100px]"].map((h, i) => (
              <Bone key={i} className={`${h} w-full !rounded-card`} />
            ))}
          </div>
          <TextBone className="mt-2 text-[13px] leading-snug" widths={["w-full", "w-16"]} />
        </div>
        <FieldSkeleton label="w-36" h="h-[96px]" />
        <Bone className="h-[52px] w-full" />
      </div>
      <TextBone className="mt-4 flex flex-col items-center text-[14px] leading-relaxed" widths={["w-56"]} />
    </OnboardingLoading>
  );
}
