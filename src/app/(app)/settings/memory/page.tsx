import type { Metadata } from "next";
import { SectionBar } from "@/components/ui/Page";
import { ErrorState } from "@/components/ui/ErrorState";
import { MemoryPanel } from "@/components/settings/MemoryPanel";
import { loadMemory } from "@/lib/api/memory";

export const metadata: Metadata = { title: "What your Myte remembers | Mytheus" };
export const dynamic = "force-dynamic";

/* Settings > Agent memory: what your Myte learned about you across meetings (core-api
   `/api/v1/me/memory`, the caller's own), and the controls over it: the learning switch, pin and
   forget topics, forget questions, unmute, how sure each agent must be, and Forget everything. */
export default async function MemorySettingsPage() {
  const memory = await loadMemory();
  return (
    <>
      <SectionBar title="What your Myte remembers" context="What it learned from the notes and suggestions you keep or dismiss, and the questions you ask. Only you see this, and you can change any of it." />
      {memory.kind === "live" ? (
        <MemoryPanel initial={memory.data} />
      ) : (
        <ErrorState title="Your Myte's memory could not be loaded" text="Nothing was lost. Your Myte keeps working with what it knows; this page returns when it can be read." />
      )}
    </>
  );
}
