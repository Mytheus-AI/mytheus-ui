/* Illustrative content for the public marketing page's product vignettes. It is copy, not
   data: no authenticated screen imports it, and it describes no real workspace. */

export type CapacityState = "over" | "near" | "ok";
export type TeammateCapacity = { name: string; util: number; state: CapacityState };

// util = % utilization this sprint; state drives bar color (over=red, near=amber, ok=clay)
// and mirrors ProactiveAgent's 80% (near) / 95% (over) capacity warnings.
export const sampleTeamCapacity: TeammateCapacity[] = [
  { name: "Sarah", util: 96, state: "over" },
  { name: "Priya", util: 88, state: "near" },
  { name: "Aisha", util: 74, state: "ok" },
  { name: "Marcus", util: 61, state: "ok" },
  { name: "Diego", util: 45, state: "ok" },
];

export type SourcedAnswer = {
  quote: string;
  source: { meeting: string; date: string };
  lineage: string[]; // FOLLOWS_FROM chain, oldest to newest
};

export const sampleSourcedAnswer: SourcedAnswer = {
  quote: "Pricing was locked at $49 in the Q2 planning call - Sarah already owns the rework.",
  source: { meeting: "Q2 Planning", date: "Apr 3" },
  lineage: ["Q2 Planning", "Q3 Planning"],
};
