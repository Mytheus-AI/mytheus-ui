import { Reveal, Stagger, StaggerItem } from "./motion";

/* ------------------------------------------------------------------ */
/*  A grid of company wordmarks with small "+" marks at every grid      */
/*  intersection (Granola's signature). Reusable in two tones: a dark   */
/*  "trusted by" band and a lighter secondary integrations grid.        */
/* ------------------------------------------------------------------ */

/** A "+" sits at the top-left corner of each cell, landing on intersections. */
function Plus({ tone }: { tone: "dark" | "light" }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -left-[5px] -top-[5px] select-none text-[0.7rem] leading-none ${
        tone === "dark" ? "text-white/25" : "text-ink/20"
      }`}
    >
      +
    </span>
  );
}

export function LogoGrid({
  heading,
  logos,
  tone = "dark",
}: {
  heading: string;
  logos: string[];
  tone?: "dark" | "light";
}) {
  const dark = tone === "dark";
  return (
    <section
      className={
        dark ? "bg-console text-console-ink" : "bg-paper-2 text-ink"
      }
    >
      <div className="mx-auto max-w-[80rem] px-6 py-20 lg:py-24">
        <Reveal>
          <p
            className={`text-center text-sm ${dark ? "text-console-ink/55" : "text-ink-soft"}`}
          >
            {heading}
          </p>
        </Reveal>

        <Reveal delay={100}>
          {/* a bordered grid; cell borders form the lines, "+" marks the joins */}
          <Stagger
            className={`mt-12 grid grid-cols-2 border-l border-t sm:grid-cols-3 lg:grid-cols-4 ${
              dark ? "border-white/10" : "border-ink/10"
            }`}
          >
            {logos.map((logo) => (
              <StaggerItem
                key={logo}
                className={`relative flex items-center justify-center border-b border-r py-9 ${
                  dark ? "border-white/10" : "border-ink/10"
                }`}
              >
                <Plus tone={tone} />
                <span
                  className={`text-lg font-semibold tracking-tight transition-colors ${
                    dark
                      ? "text-white/45 hover:text-white/85"
                      : "text-ink/45 hover:text-ink/80"
                  }`}
                >
                  {logo}
                </span>
              </StaggerItem>
            ))}
          </Stagger>
        </Reveal>
      </div>
    </section>
  );
}
