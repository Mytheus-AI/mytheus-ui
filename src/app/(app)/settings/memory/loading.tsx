import { SettingsPanelSkeleton } from "@/components/settings/SettingsSkeleton";

/* What your Myte remembers, while it loads: MemoryPanel's stack of cards (learning, topics,
   questions, muted topics, how sure it needs to be, what you have open, forget everything). */
export default function Loading() {
  return (
    <SettingsPanelSkeleton
      label="Loading what your Myte remembers"
      bar={{ title: "w-64", context: ["w-[580px]", "w-[260px]"], narrow: ["w-[50%]"] }}
      wrapClass="flex flex-col gap-5"
      cards={[
        { title: "w-24", rows: ["inline"] },
        { title: "w-36", rows: ["inline", "inline", "inline"] },
        { title: "w-48", rows: ["inline", "inline"] },
        { title: "w-32", rows: ["text"] },
        { title: "w-48", rows: ["choices"] },
        { title: "w-40", rows: ["info", "info"] },
        { title: "w-40", rows: ["inline"] },
      ]}
    />
  );
}
