import { LocationPrompt } from "../../src/components/app/LocationPrompt";

/** The where-do-you-work prompt over a stand-in page, at the foot of the viewport as in the app. */
export function LocationHarness({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <div className="mx-app min-h-screen bg-bg p-8 text-ink" data-theme={theme}>
      <h1 className="display text-[34px] text-ink">Home</h1>
      <p className="mt-2 text-[15px] text-ink-3">A page behind the prompt.</p>
      <LocationPrompt />
    </div>
  );
}
