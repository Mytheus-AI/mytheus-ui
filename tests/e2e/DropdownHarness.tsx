import { useState } from "react";
import "../../src/styles/meeting.css";
import "../../src/components/room/room-polish.css";
import { CalendarBlank, Microphone, Timer } from "@phosphor-icons/react";
import { Dropdown, type DropdownOption } from "../../src/components/ui/Dropdown";
import { RoomDialog } from "../../src/components/room/RoomDialog";

/* The shared dropdown on its own: a form field with a visible label, a hidden input, groups,
   descriptions, icons, a disabled option and a very long label; one more pinned to the bottom of
   the page (so it must flip up); and one inside a native modal <dialog>. */

type Owner = "" | "u-raj" | "u-priya" | "u-pricing" | "u-peter" | "u-long";

const OWNERS: DropdownOption<Owner>[] = [
  { value: "", label: "No owner" },
  { value: "u-raj", label: "Raj Patel", description: "Engineering", group: "In this meeting", icon: <Microphone size={16} /> },
  { value: "u-priya", label: "Priya Nair", description: "Design", group: "In this meeting" },
  { value: "u-pricing", label: "Pricing desk", description: "Not available", group: "Elsewhere", disabled: true },
  { value: "u-peter", label: "Peter Hall", group: "Elsewhere" },
  {
    value: "u-long",
    label: "Default - MacBook Pro Microphone (Built-in) with a label far too long to fit in any trigger",
    group: "Elsewhere",
  },
];

const LENGTHS: DropdownOption<string>[] = ["15", "30", "45", "60", "90"].map((v) => ({ value: v, label: `${v} min` }));

export function DropdownHarness({ theme = "light" }: { theme?: "light" | "dark" }) {
  const [owner, setOwner] = useState<Owner>("");
  const [length, setLength] = useState("30");
  const [inDialog, setInDialog] = useState("45");
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <div className="mx-app mx-meet min-h-dvh bg-bg p-6" data-theme={theme}>
      <main style={{ display: "grid", gap: 16, maxWidth: 420 }}>
        <h1 className="display text-[28px]">Dropdown</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(String(new FormData(e.currentTarget).get("owner")));
          }}
          style={{ display: "grid", gap: 6 }}
        >
          <label htmlFor="dd-owner" className="text-[14px] font-semibold text-ink">
            Owner
          </label>
          <Dropdown id="dd-owner" name="owner" label="Owner" value={owner} onChange={setOwner} options={OWNERS} describedBy="dd-owner-hint" />
          <p id="dd-owner-hint" className="text-[12.5px] text-ink-3">
            Who carries this item.
          </p>
          <button type="submit" className="mx-btn tap" style={{ justifySelf: "start" }}>
            Save owner
          </button>
          <p role="status">{submitted === null ? "" : `Saved: ${submitted || "nobody"}`}</p>
        </form>
        <button type="button" className="mx-btn is-outline tap" style={{ justifySelf: "start" }} onClick={() => setOpen(true)}>
          Open the dialog
        </button>
      </main>
      <div style={{ position: "fixed", left: 24, bottom: 16, width: 220 }}>
        <Dropdown label="Length" value={length} onChange={setLength} options={LENGTHS} icon={<Timer size={16} />} sheet="never" />
      </div>
      <RoomDialog open={open} onClose={() => setOpen(false)} title="Plan the follow-up">
        <p>Pick how long it runs.</p>
        <div style={{ marginTop: 12 }}>
          <Dropdown label="Follow-up length" value={inDialog} onChange={setInDialog} options={LENGTHS} icon={<CalendarBlank size={16} />} />
        </div>
        <div className="room-dialog-acts">
          <button type="button" className="nfy-act tap" onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </RoomDialog>
    </div>
  );
}
