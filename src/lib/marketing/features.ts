/* The single source of truth for the marketing feature pages: nav menus, the
   footer, the /features hub, and every /features/* page all read from here.
   Copy markets by benefit, never by internal agent class names (the mapping to
   the six agents lives in the comments only). Capability notes are honest —
   they describe what ships, including the confirm-before-write rule and the
   confidence filtering, in user language. */

export type VisualKey =
  | "notes"
  | "suggestions"
  | "decision"
  | "tasks"
  | "exchange"
  | "capacity"
  | "captions"
  | "search"
  | "graph"
  | "integrations";

export type FeatureDef = {
  slug: string;
  nav: string; // short label for menus / footer
  eyebrow: string;
  title: string; // hero heading, plain part
  accent: string; // trailing italic clay accent
  blurb: string;
  visual: VisualKey;
  benefits: { title: string; body: string }[];
  note: string; // the honest capability note
};

export const FEATURES: FeatureDef[] = [
  // PersonalListenerAgent
  {
    slug: "personal-agent",
    nav: "Personal agent",
    eyebrow: "Personal agent",
    title: "A meeting agent that works",
    accent: "for you.",
    blurb:
      "Everyone in the room gets their own AI agent, tuned to their role and their work — not one shared bot writing the same generic notes for everybody.",
    visual: "notes",
    benefits: [
      {
        title: "Tuned to your role",
        body: "Your agent knows what you do. An engineer and a product manager leave the same meeting with different notes — each relevant to their own work, not a lowest-common-denominator summary.",
      },
      {
        title: "Private by default",
        body: "What your agent captures is yours. You share a note, a decision, or an action when you choose to — nothing is broadcast to the room on your behalf.",
      },
      {
        title: "No bot in the room",
        body: "There's no recording link to admit and no bot tile in the video grid. Your agent rides along with you, quietly, in every meeting you join.",
      },
    ],
    note: "Your agent drafts; you decide. Nothing is saved, assigned, or shared without your one-tap confirm.",
  },
  // PersonalListenerAgent (worklogs)
  {
    slug: "live-notes",
    nav: "Live notes",
    eyebrow: "Live notes",
    title: "Notes that write",
    accent: "themselves.",
    blurb:
      "Role-relevant notes stream in while you talk — so you leave every meeting with structured minutes instead of homework.",
    visual: "notes",
    benefits: [
      {
        title: "Live, not afterwards",
        body: "Notes appear as the words are said, streaming into your sidebar during the meeting — not in an email an hour later.",
      },
      {
        title: "Structured on arrival",
        body: "Headings, owners, and next steps — your shorthand and the room's conversation come back as clean, shareable minutes.",
      },
      {
        title: "Signal over noise",
        body: "Your agent surfaces only what it's confident matters to you; borderline lines are quietly logged instead of shouted, so the notes stay readable.",
      },
    ],
    note: "Notes stream live over the meeting connection. If your network drops, the durable copy is rebuilt when you reconnect — a missed moment is never lost data.",
  },
  // QuestionAgent
  {
    slug: "smart-questions",
    nav: "Smart questions",
    eyebrow: "Smart questions",
    title: "The right question, at the right",
    accent: "moment.",
    blurb:
      "Your agent listens for the gaps and suggests the question you'd wish you had asked — color-coded by how urgently it matters.",
    visual: "suggestions",
    benefits: [
      {
        title: "Urgency you can read at a glance",
        body: "Every suggestion wears its priority: red means act now, yellow means worth attention, blue is context. You triage in half a second.",
      },
      {
        title: "Suggested, never spoken",
        body: "Your agent never talks in your meeting. Suggestions land in your private sidebar — use one, rephrase it, or ignore it entirely.",
      },
      {
        title: "Filtered for confidence",
        body: "Only suggestions your agent is genuinely confident in surface mid-meeting; the rest are logged quietly so your attention isn't spent on maybes.",
      },
    ],
    note: "Suggestions are private to you and disappear if you dismiss them — nothing about them is stored to your org's record unless you act on one.",
  },
  // DecisionAgent
  {
    slug: "decisions",
    nav: "Decision tracking",
    eyebrow: "Decisions",
    title: "Decisions, detected and",
    accent: "remembered.",
    blurb:
      "The moment the room decides, it's labeled, waits for your confirm, and joins a lineage you can trace across meetings.",
    visual: "decision",
    benefits: [
      {
        title: "Caught as they happen",
        body: "\"Let's lock pricing at $49\" becomes a labeled decision the moment it's said — no one has to remember to write it down.",
      },
      {
        title: "Confirmed by you",
        body: "Every detected decision shows Confirm, Edit, and Dismiss. Only a confirm makes it real — the agent never commits the room to anything silently.",
      },
      {
        title: "Traceable lineage",
        body: "Decisions link to the decisions they follow from. When Q3 planning reopens a Q2 call, the whole chain is one click away.",
      },
    ],
    note: "Dismissed detections leave no trace in your org's record; edited ones save exactly what you approved, not what the agent guessed.",
  },
  // ActionAgent
  {
    slug: "action-items",
    nav: "Action items",
    eyebrow: "Action items",
    title: "Every action item, captured and",
    accent: "chased.",
    blurb:
      "Say \"I'll own it\" and it becomes an assigned task — with an owner, a due date, and a follow-up that doesn't depend on anyone's memory.",
    visual: "tasks",
    benefits: [
      {
        title: "Assigned in the room",
        body: "Ownership is captured the moment it's volunteered — with the owner, the context, and who else needs to know.",
      },
      {
        title: "Confirmed, not assumed",
        body: "A task only lands on someone's plate after a confirm. Nobody discovers a surprise assignment they never agreed to.",
      },
      {
        title: "Followed up for you",
        body: "Open items resurface when the next relevant meeting starts — the follow-through happens without anyone keeping a spreadsheet.",
      },
    ],
    note: "Action items sync to your project tracker only when you've connected one, and only after they're confirmed.",
  },
  // ContextGapAgent — the #2 differentiator
  {
    slug: "context-gaps",
    nav: "Cross-meeting answers",
    eyebrow: "Cross-meeting context",
    title: "Your agent asks the agents that were",
    accent: "there.",
    blurb:
      "Missing context mid-meeting? Your agent asks another participant's agent and brings back the answer — cited to the exact meeting it came from.",
    visual: "exchange",
    benefits: [
      {
        title: "Answers from meetings you missed",
        body: "When the room references \"the pricing call,\" your agent fills the gap from the agents that were in it — while the conversation is still happening.",
      },
      {
        title: "Sourced, always",
        body: "Every answer arrives with its citation: which meeting, when, and who said it. You never have to take the agent's word for it.",
      },
      {
        title: "The whole org's memory",
        body: "The more your team meets, the more there is to draw on — context compounds across meetings instead of evaporating after each one.",
      },
    ],
    note: "Agents only share what their owners' access allows, and every answer carries its source so you can verify it yourself.",
  },
  // ProactiveAgent
  {
    slug: "proactive-insights",
    nav: "Proactive insights",
    eyebrow: "Proactive insights",
    title: "Problems flagged before they",
    accent: "land.",
    blurb:
      "Overloaded teammates, conflicting decisions, missing stakeholders, blocked dependencies — surfaced while there's still time to act.",
    visual: "capacity",
    benefits: [
      {
        title: "Workload warnings",
        body: "Assign work to someone already at capacity and the room hears about it — at 80% it's a heads-up, past 95% it's a red flag.",
      },
      {
        title: "Conflict catches",
        body: "A new decision that contradicts an old one gets flagged with both sides cited — before it ships as a surprise.",
      },
      {
        title: "Stakeholder & dependency alerts",
        body: "Deciding without the person who owns the area, or on top of something blocked? Your agent names who's missing and what's in the way.",
      },
    ],
    note: "Insights are warnings, not vetoes — the room always decides. Red is reserved for act-now moments so a red flag keeps meaning something.",
  },
  // transcription-service
  {
    slug: "transcription",
    nav: "Live transcription",
    eyebrow: "Transcription",
    title: "Captions in under two",
    accent: "seconds.",
    blurb:
      "Live captions with speaker labels, fast enough to follow in the room — and a transcript worth coming back to.",
    visual: "captions",
    benefits: [
      {
        title: "Fast enough to rely on",
        body: "Captions render within two seconds of the words being spoken — usable live, not just as an archive.",
      },
      {
        title: "Who said what",
        body: "Every line carries its speaker, so the transcript reads like the meeting actually went — not a wall of anonymous text.",
      },
      {
        title: "Useful long after",
        body: "Click any line to jump to that moment, search within the meeting, and cite the exact sentence in an answer.",
      },
    ],
    note: "Interim captions refine themselves as speech settles; the final transcript is the durable record, and it's the only version that's stored.",
  },
  // search-service / rag-service
  {
    slug: "search",
    nav: "Meeting search",
    eyebrow: "Search",
    title: "Ask your meetings",
    accent: "anything.",
    blurb:
      "Semantic search across everything said and decided — and answers that come back with citations to the exact meeting.",
    visual: "search",
    benefits: [
      {
        title: "Meaning, not keywords",
        body: "Ask \"what did we agree on pricing?\" and get the decision — even if nobody ever said the word \"agree.\"",
      },
      {
        title: "Answers with receipts",
        body: "Every answer cites the meeting, the moment, and the speaker it came from. If it can't cite it, it says so instead of guessing.",
      },
      {
        title: "Scoped to you",
        body: "Search sees what you're allowed to see — your meetings, your team's shared record — and nothing beyond it.",
      },
    ],
    note: "Answers are grounded in your meeting record. When the record doesn't contain an answer, you get \"not found\" — not a confident invention.",
  },
  // knowledge-graph-service
  {
    slug: "knowledge-graph",
    nav: "Knowledge graph",
    eyebrow: "Knowledge graph",
    title: "Your organization's",
    accent: "memory.",
    blurb:
      "People, meetings, decisions, actions, and topics — connected into one graph your agents traverse to answer with context.",
    visual: "graph",
    benefits: [
      {
        title: "Connected, not filed",
        body: "A decision knows its meeting, its owner, the actions it spawned, and the decision it superseded — memory with structure, not a folder of documents.",
      },
      {
        title: "Only what you confirmed",
        body: "The graph grows through confirmed decisions and actions — it's a record of what your team actually agreed, not everything an AI overheard.",
      },
      {
        title: "Context that compounds",
        body: "Every meeting adds edges. Six months in, your agents answer questions no individual could — because the graph remembers what people forget.",
      },
    ],
    note: "The graph is per-organization and isolated by design — your record is never pooled with anyone else's.",
  },
  // integration-service (R8 guardrail)
  {
    slug: "integrations",
    nav: "Integrations",
    eyebrow: "Integrations",
    title: "Meets your tools where they",
    accent: "are.",
    blurb:
      "Google Calendar for scheduling, Slack for routing, and Jira or Linear for the work itself — the essentials, done properly.",
    visual: "integrations",
    benefits: [
      {
        title: "Calendar-aware",
        body: "Meetings come from your Google Calendar, and what your agents prepare is ready before you join — no copy-pasting invite links.",
      },
      {
        title: "Slack, where the follow-up lives",
        body: "Confirmed decisions and action items route to the right Slack channel or DM — so the people who missed the meeting still hear the outcome.",
      },
      {
        title: "Jira or Linear, your pick",
        body: "Confirmed action items become real tickets in the tracker your team already uses — one connection, no duplicate task lists.",
      },
    ],
    note: "We deliberately keep the surface small: Calendar and Slack on every paid plan, plus one project tracker — Jira or Linear — per workspace.",
  },
];

export function getFeature(slug: string): FeatureDef {
  const f = FEATURES.find((x) => x.slug === slug);
  if (!f) throw new Error(`Unknown feature slug: ${slug}`);
  return f;
}
