/* A tiny drawn glyph per feature for the /features hub: the coral line comes in along a baseline,
   draws the feature's shape, and leaves again, like the step marks on the home page. Each path
   has pathLength 1 so it draws when an ancestor gets `.in`; `--dl` staggers them. Decorative. */

const GLYPHS: Record<string, string[]> = {
  // a head and shoulders: the person the agent works for
  "personal-agent": ["M0 36 H22 C22 28 26 24 32 24 C38 24 42 28 42 36 H64", "M32 20 a6.5 6.5 0 1 0 0 -13 a6.5 6.5 0 1 0 0 13"],
  // a page with three lines of notes
  "live-notes": ["M0 36 H16 V6 H42 L48 12 V36 H64", "M22 15 H40 M22 21 H42 M22 27 H34"],
  // a question mark sitting on the line
  "smart-questions": ["M0 36 H64", "M25 12 C25 7 28.5 4.5 32 4.5 C36 4.5 39 7 39 11 C39 16.5 32 17 32 23 V25", "M32 31 h0.01"],
  // a ring with a tick: confirmed
  decisions: ["M0 36 H32 a15 15 0 1 0 0 -30 a15 15 0 1 0 0 30 H64", "M25 21 L30 26 L39.5 15.5"],
  // a checkbox with a tick
  "action-items": ["M0 36 H20 V10 H44 V36 H64", "M26 23 L30.5 27.5 L38.5 17"],
  // two agents and the arc between them
  "context-gaps": ["M0 36 H4 a7 7 0 1 1 14 0 C22 14 42 14 46 36 a7 7 0 1 1 14 0 H64"],
  // a warning triangle
  "proactive-insights": ["M0 36 H17 L32 7 L47 36 H64", "M32 17 V26", "M32 31 h0.01"],
  // a voice waveform
  transcription: ["M0 22 H10 L14 13 L19 31 L24 7 L29 36 L34 14 L39 29 L44 18 L48 22 H64"],
  // a magnifier
  search: ["M0 36 H42 L35.5 27.5 A10 10 0 1 1 21 13 A10 10 0 1 1 35.5 27.5", "M42 36 H64"],
  // three connected nodes
  "knowledge-graph": ["M0 36 H12 L24 14 L40 28 L52 8", "M24 10.5 a3.5 3.5 0 1 0 0 7 a3.5 3.5 0 1 0 0 -7 M40 24.5 a3.5 3.5 0 1 0 0 7 a3.5 3.5 0 1 0 0 -7", "M52 36 H64"],
  // two blocks joined: tools connected
  integrations: ["M0 36 H8 V18 H26 V36 H38 V18 H56 V36 H64", "M26 27 H38"],
};

export function FeatureGlyph({ slug, delay = 0, className = "" }: { slug: string; delay?: number; className?: string }) {
  const paths = GLYPHS[slug] ?? ["M0 36 H64"];
  return (
    <svg aria-hidden viewBox="0 0 64 40" className={`h-10 w-16 overflow-visible ${className}`}>
      {paths.map((d, i) => (
        <path
          key={i}
          className="line-stroke line-draw"
          pathLength={1}
          d={d}
          style={{ ["--du" as string]: ".7s", ["--dl" as string]: `${delay + i * 0.35}s` }}
        />
      ))}
    </svg>
  );
}
