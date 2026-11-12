import { AgentOrb } from "../../src/components/agent/AgentOrb";
import { Avatar } from "../../src/components/ui/Avatar";
import { DoodlePicker } from "../../src/components/ui/DoodlePicker";

/* People and agents side by side: people wear ink doodles, agents wear plush characters. */

export function FacesHarness({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ minHeight: "100dvh", padding: 32 }}>
      <main style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 className="display" style={{ fontSize: 28 }}>
          Faces
        </h1>
        <section aria-label="People" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar name="Maya Chen" id="maya@example.com" size="md" />
          <Avatar name="Raj Patel" id="raj@example.com" seed="abcd2345" size="lg" />
        </section>
        <section aria-label="Agents" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ display: "block", width: 44, height: 44, borderRadius: 999, overflow: "hidden" }}>
            <AgentOrb seed="ic5kget9wh" size={44} label="Maya's agent" />
          </span>
        </section>
        <section aria-label="Picker" style={{ maxWidth: 560 }}>
          <DoodlePicker value="abcd2345" onChange={() => {}} />
        </section>
      </main>
    </div>
  );
}
