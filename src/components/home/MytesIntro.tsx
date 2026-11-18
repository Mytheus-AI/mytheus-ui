import { MyteStage, type StageMyte } from "@/components/home/fx/MyteStage";

/* Introducing Mytes: the cast. Five Mytes, one per person in a meeting, stand on one arc joined by
   a dotted coral trail; a spark runs between them the way one Myte asks another (the relay is a
   real capability: see RelaySection). The Myte the spark last reached says, in a bubble, what it
   kept for its person: the same meeting, five different notes, because each is tuned to its
   person's role. The people are examples; a Myte's name and face are set in Settings. */

const CAST: StageMyte[] = [
  {
    src: "/home/mytes/myte-pebble.glb",
    name: "Ana",
    role: "Product",
    colour: "#f76638",
    kept: "Launch moves to the 24th. You own the announcement.",
  },
  {
    src: "/home/mytes/myte-cloud.glb",
    name: "Ravi",
    role: "Engineering",
    colour: "#4c78f7",
    kept: "The API change ships behind a flag. You review the migration.",
  },
  {
    src: "/home/mytes/myte-gumdrop.glb",
    name: "Mei",
    role: "Design",
    colour: "#fcb529",
    kept: "Onboarding stays at three steps. New copy is due Friday.",
  },
  {
    src: "/home/mytes/myte-star.glb",
    name: "Tom",
    role: "Sales",
    colour: "#3dbd85",
    kept: "Acme needs SSO before they sign. Security is looped in.",
  },
  {
    src: "/home/mytes/myte-bun.glb",
    name: "Zara",
    role: "Support",
    colour: "#9975f7",
    kept: "The billing fix is in 2.4. Four customers are waiting to hear.",
  },
];

export function MytesIntro() {
  return (
    <section
      id="mytes"
      data-snap=""
      data-snap-label="Introducing Mytes"
      aria-labelledby="mytes-title"
      className="relative overflow-hidden py-[clamp(56px,7vw,96px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center"
    >
      {/* a warm pool of light behind the cast */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[38%] mx-auto h-[60%] max-w-[1100px] rounded-[50%] opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, var(--signal-soft), transparent)",
        }}
      />

      <div className="relative mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <div data-snap-in="" className="mx-auto max-w-[720px] text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-semibold text-ink-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-50 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            New in Mytheus
          </p>
          <h2
            id="mytes-title"
            className="display mt-5 text-[clamp(2.6rem,6.2vw,5rem)] leading-[0.96]"
          >
            Introducing Mytes.
          </h2>
          <p className="mx-auto mt-5 max-w-[52ch] text-[clamp(1.06rem,1.5vw,1.22rem)] leading-relaxed text-ink-3">
            One for everyone in the meeting. Each Myte listens for its person,
            keeps what matters to them, and asks the other Mytes when it needs
            context, so nobody has to chase.
          </p>
        </div>

        <div
          data-snap-in=""
          style={{ ["--si" as string]: 2 }}
          className="relative mx-auto mt-[clamp(8px,2vw,20px)] h-[clamp(760px,220vw,880px)] w-full sm:h-[clamp(340px,36vw,500px)]"
        >
          <MyteStage mytes={CAST} />
        </div>

        <p
          data-snap-in=""
          style={{ ["--si" as string]: 3 }}
          className="mt-1 text-center text-[13px] text-ink-3"
        >
          Same meeting, five different notes. Hover a Myte to hear from it.
        </p>

        <ul className="sr-only">
          {CAST.map((c) => (
            <li key={c.name}>
              {c.name}&rsquo;s Myte, {c.role}: {c.kept}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
