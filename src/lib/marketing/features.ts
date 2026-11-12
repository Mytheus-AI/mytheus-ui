/* The single source of truth for the marketing feature pages: nav menus, the
   footer, the /features hub, and every /features/* page all read from here.
   Copy markets by benefit, never by internal agent class names (the mapping to
   the six agents lives in the comments only). Capability notes are honest:
   they describe what ships, including the confirm-before-write rule and the
   confidence filtering, in user language. Copy rules: plain, specific,
   sentence case, no dashes, no emoji (docs/DESIGN-ONELINE.md). */

export type VisualKey =
  | "agent"
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
  title: string; // hero heading, the part before the looped phrase
  accent: string; // the key phrase the hero's coral loop circles
  blurb: string;
  visual: VisualKey;
  benefitsTitle: string; // serif title of the benefits section
  benefitsLead: string; // the lead beside it
  benefits: { title: string; body: string }[];
  note: string; // the honest capability note
};

export const FEATURES: FeatureDef[] = [
  // PersonalListenerAgent
  {
    slug: "personal-agent",
    nav: "Your Myte",
    eyebrow: "Your Myte",
    title: "A Myte that works",
    accent: "for you.",
    blurb:
      "Everyone in the meeting gets their own Myte, a personal AI agent tuned to their role and their work. Not one shared bot writing the same notes for everybody.",
    visual: "agent",
    benefitsTitle: "One meeting, a different set of notes for each person.",
    benefitsLead:
      "Your Myte knows what you do, keeps what it captures to itself, and never shows up as a tile in the call.",
    benefits: [
      {
        title: "Tuned to your role",
        body: "An engineer and a product manager leave the same meeting with different notes, each about their own work instead of a summary written for nobody in particular.",
      },
      {
        title: "Private by default",
        body: "What your Myte captures is yours. You share a note, a decision or an action when you choose to. Nothing goes to the room on your behalf.",
      },
      {
        title: "No bot in the room",
        body: "There is no recording link to admit and no bot tile in the video grid. Your Myte comes with you, quietly, into every meeting you join.",
      },
    ],
    note: "Your Myte drafts and you decide. Nothing is saved, assigned or shared until you confirm it with one tap.",
  },
  // PersonalListenerAgent (worklogs)
  {
    slug: "live-notes",
    nav: "Live notes",
    eyebrow: "Live notes",
    title: "Notes that write",
    accent: "themselves.",
    blurb:
      "Notes for your role stream in while people talk, so you leave every meeting with structured minutes instead of homework.",
    visual: "notes",
    benefitsTitle: "Minutes while you talk, not an email an hour later.",
    benefitsLead:
      "Your shorthand and the room's conversation come back as clean notes with headings, owners and next steps.",
    benefits: [
      {
        title: "Live, not afterwards",
        body: "Notes appear as the words are said, streaming into your sidebar during the meeting.",
      },
      {
        title: "Structured on arrival",
        body: "Headings, owners and next steps arrive already in place, so the notes are ready to share when the call ends.",
      },
      {
        title: "Signal over noise",
        body: "Your Myte surfaces what it is confident matters to you. Borderline lines are logged quietly instead of crowding the notes.",
      },
    ],
    note: "Notes stream live over the meeting connection. If your network drops, the durable copy is rebuilt when you reconnect, so a missed moment never means lost notes.",
  },
  // QuestionAgent
  {
    slug: "smart-questions",
    nav: "Smart questions",
    eyebrow: "Smart questions",
    title: "The right question at the",
    accent: "right moment.",
    blurb:
      "Your Myte listens for gaps and suggests the question you would wish you had asked, color-coded by how urgently it matters.",
    visual: "suggestions",
    benefitsTitle: "Ask it before the meeting moves on.",
    benefitsLead:
      "Suggestions land in your private sidebar with their urgency on them. Use one, rephrase it or let it go.",
    benefits: [
      {
        title: "Urgency at a glance",
        body: "Every suggestion wears its priority: red means act now, amber is worth attention, blue is context. You can triage in half a second.",
      },
      {
        title: "Suggested, never spoken",
        body: "Your Myte never talks in your meeting. Suggestions stay in your private sidebar until you decide what to do with them.",
      },
      {
        title: "Filtered for confidence",
        body: "Only suggestions your Myte is confident in appear mid-meeting. The rest are logged quietly, so your attention is not spent on maybes.",
      },
    ],
    note: "Suggestions are private to you and disappear when you dismiss them. Nothing about them is stored in your organization's record unless you act on one.",
  },
  // DecisionAgent
  {
    slug: "decisions",
    nav: "Decision tracking",
    eyebrow: "Decisions",
    title: "Decisions, caught and",
    accent: "remembered.",
    blurb:
      "The moment the room decides, the decision is labeled, waits for your confirm and joins a lineage you can trace across meetings.",
    visual: "decision",
    benefitsTitle: "Nobody has to remember to write it down.",
    benefitsLead:
      "Decisions are caught as they are said, saved only when you confirm them, and linked to the calls they came from.",
    benefits: [
      {
        title: "Caught as they happen",
        body: "“Let's lock pricing at $49” becomes a labeled decision the moment it is said. Nobody has to stop and take it down.",
      },
      {
        title: "Confirmed by you",
        body: "Every detected decision offers Confirm, Edit and Dismiss. Only a confirm makes it real, so a Myte never commits the room to anything on its own.",
      },
      {
        title: "Traceable lineage",
        body: "Decisions link to the decisions they follow from. When Q3 planning reopens a Q2 call, the whole chain is one click away.",
      },
    ],
    note: "Dismissed detections leave no trace in your organization's record. Edited ones save exactly what you approved, not what your Myte guessed.",
  },
  // ActionAgent
  {
    slug: "action-items",
    nav: "Action items",
    eyebrow: "Action items",
    title: "Every action item, captured and",
    accent: "chased.",
    blurb:
      "Say “I'll own it” and it becomes an assigned task with an owner, a due date and a follow-up that does not depend on anyone's memory.",
    visual: "tasks",
    benefitsTitle: "From “I'll take it” to a task with an owner.",
    benefitsLead:
      "Ownership is captured in the room, confirmed before it lands on anyone's plate, and brought back until it is done.",
    benefits: [
      {
        title: "Assigned in the room",
        body: "Ownership is captured the moment it is volunteered, along with the context and who else needs to know.",
      },
      {
        title: "Confirmed, not assumed",
        body: "A task lands on someone's plate only after a confirm. Nobody finds a surprise assignment they never agreed to.",
      },
      {
        title: "Followed up for you",
        body: "Open items come back when the next relevant meeting starts, so follow-through happens without anyone keeping a spreadsheet.",
      },
    ],
    note: "Action items sync to your project tracker only when you have connected one, and only after they are confirmed.",
  },
  // ContextGapAgent: the #2 differentiator
  {
    slug: "context-gaps",
    nav: "Cross-meeting answers",
    eyebrow: "Cross-meeting context",
    title: "Your Myte asks the Mytes that were",
    accent: "there.",
    blurb:
      "Missing context mid-meeting? Your Myte asks another participant's Myte and brings back the answer, cited to the exact meeting it came from.",
    visual: "exchange",
    benefitsTitle: "Answers from meetings you were not in.",
    benefitsLead:
      "When the room mentions “the pricing call”, your Myte fills the gap while the conversation is still going.",
    benefits: [
      {
        title: "Answers from meetings you missed",
        body: "Your Myte asks the Mytes of the people who were in that meeting, and brings the answer back while it still matters.",
      },
      {
        title: "Sourced, always",
        body: "Every answer arrives with its citation: which meeting, when, and who said it. You never have to take a Myte's word for it.",
      },
      {
        title: "Your team's memory",
        body: "The more your team meets, the more there is to draw on. Context builds up across meetings instead of disappearing after each one.",
      },
    ],
    note: "Mytes share only what their owners' access allows, and every answer carries its source so you can check it yourself.",
  },
  // ProactiveAgent
  {
    slug: "proactive-insights",
    nav: "Proactive insights",
    eyebrow: "Proactive insights",
    title: "Problems flagged before they",
    accent: "land.",
    blurb:
      "Overloaded teammates, conflicting decisions, missing stakeholders and blocked dependencies, surfaced while there is still time to act.",
    visual: "capacity",
    benefitsTitle: "A warning while the room can still change course.",
    benefitsLead:
      "Your Myte checks new assignments and decisions against what your team has already agreed and already has on its plate.",
    benefits: [
      {
        title: "Workload warnings",
        body: "Assign work to someone already near capacity and the room hears about it. At 80% it is a heads-up; past 95% it is a red flag.",
      },
      {
        title: "Conflict catches",
        body: "A new decision that contradicts an earlier one is flagged with both sides cited, before it ships as a surprise.",
      },
      {
        title: "Stakeholder and dependency alerts",
        body: "Deciding without the person who owns the area, or on top of something blocked? Your Myte names who is missing and what is in the way.",
      },
    ],
    note: "Insights are warnings, not vetoes. The room always decides. Red is kept for act-now moments, so a red flag keeps meaning something.",
  },
  // transcription-service
  {
    slug: "transcription",
    nav: "Live transcription",
    eyebrow: "Transcription",
    title: "Captions in under",
    accent: "two seconds.",
    blurb:
      "Live captions with speaker labels, fast enough to follow in the room, and a transcript worth coming back to.",
    visual: "captions",
    benefitsTitle: "Fast enough to follow, kept for later.",
    benefitsLead:
      "Every line carries its speaker, and the final transcript is something you can search, jump through and cite.",
    benefits: [
      {
        title: "Fast enough to rely on",
        body: "Captions appear within two seconds of the words being spoken, so they work live and not only as an archive.",
      },
      {
        title: "Who said what",
        body: "Every line carries its speaker, so the transcript reads the way the meeting actually went.",
      },
      {
        title: "Useful long after",
        body: "Click any line to jump to that moment, search within the meeting and cite the exact sentence in an answer.",
      },
    ],
    note: "Interim captions refine themselves as speech settles. The final transcript is the durable record, and it is the only version that is stored.",
  },
  // search-service / rag-service
  {
    slug: "search",
    nav: "Meeting search",
    eyebrow: "Search",
    title: "Ask your meetings",
    accent: "anything.",
    blurb:
      "Search by meaning across everything said and decided, with answers that cite the exact meeting they came from.",
    visual: "search",
    benefitsTitle: "Ask the way you would ask a colleague.",
    benefitsLead: "Search understands what you mean and shows where every answer came from.",
    benefits: [
      {
        title: "Meaning, not keywords",
        body: "Ask “what did we agree on pricing?” and get the decision, even if nobody ever said the word “agree”.",
      },
      {
        title: "Answers with receipts",
        body: "Every answer cites the meeting, the moment and the speaker it came from. If it cannot cite it, it says so instead of guessing.",
      },
      {
        title: "Scoped to you",
        body: "Search sees what you are allowed to see: your meetings and your team's shared record, and nothing beyond it.",
      },
    ],
    note: "Answers are grounded in your meeting record. When the record does not contain an answer, you get “not found”, not a confident invention.",
  },
  // knowledge-graph-service
  {
    slug: "knowledge-graph",
    nav: "Knowledge graph",
    eyebrow: "Knowledge graph",
    title: "Your organization's",
    accent: "memory.",
    blurb:
      "People, meetings, decisions, actions and topics, connected into one graph your Mytes use to answer with context.",
    visual: "graph",
    benefitsTitle: "Memory with structure, not a folder of documents.",
    benefitsLead: "Each confirmed decision knows where it was made, who owns it and what it led to.",
    benefits: [
      {
        title: "Connected, not filed",
        body: "A decision knows its meeting, its owner, the actions it started and the decision it replaced.",
      },
      {
        title: "Only what you confirmed",
        body: "The graph grows from confirmed decisions and actions. It records what your team agreed, not everything an AI overheard.",
      },
      {
        title: "Context that compounds",
        body: "Every meeting adds connections. Six months in, your Mytes can answer questions no single person could, because the graph remembers what people forget.",
      },
    ],
    note: "The graph is per organization and isolated by design. Your record is never pooled with anyone else's.",
  },
  // integration-service (R8 guardrail)
  {
    slug: "integrations",
    nav: "Integrations",
    eyebrow: "Integrations",
    title: "Follow-up that lands in",
    accent: "your tools.",
    blurb:
      "Google Calendar for scheduling, Slack for routing, and Jira or Linear for the work itself. The essentials, done properly.",
    visual: "integrations",
    benefitsTitle: "A small set of connections, each one done properly.",
    benefitsLead:
      "Meetings come in from your calendar, and confirmed outcomes go out to the people and the tracker that need them.",
    benefits: [
      {
        title: "Calendar-aware",
        body: "Meetings come from your Google Calendar, and what your Myte prepares is ready before you join. No copying invite links.",
      },
      {
        title: "Slack, where follow-up lives",
        body: "Confirmed decisions and action items go to the right Slack channel or DM, so people who missed the meeting still hear the outcome.",
      },
      {
        title: "Jira or Linear, your pick",
        body: "Confirmed action items become real tickets in the tracker your team already uses. One connection, no duplicate task lists.",
      },
    ],
    note: "We keep the surface small on purpose: Calendar and Slack on every paid plan, plus one project tracker, Jira or Linear, per workspace.",
  },
];

export function getFeature(slug: string): FeatureDef {
  const f = FEATURES.find((x) => x.slug === slug);
  if (!f) throw new Error(`Unknown feature slug: ${slug}`);
  return f;
}

/** The features that make up "your Myte"; the rest are the platform. Read by the footer, the
    nav and the /features hub so the grouping is defined once. */
export const AGENT_SLUGS = ["personal-agent", "live-notes", "smart-questions", "decisions", "action-items", "context-gaps"];
