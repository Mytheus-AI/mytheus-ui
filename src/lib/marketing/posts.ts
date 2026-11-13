/* The blog's posts. Static content: the index (/blog) lists them newest first and each one has
   its own page at /blog/[slug]. A body is a list of blocks: a plain string is a paragraph,
   `h` a section heading, `list` a bulleted list, `quote` the one line worth pulling out.
   Copy rules are the site's: plain, sentence case, no em or en dashes, no invented customers. */

export type PostBlock = string | { h: string } | { list: string[] } | { quote: string };

export type Post = {
  slug: string;
  category: "Product" | "Memory" | "Craft" | "Engineering" | "Teams";
  title: string;
  excerpt: string;
  /** ISO date, shown as "12 Oct 2026" */
  date: string;
  author: string;
  body: PostBlock[];
};

const TEAM = "The Mytheus team";

export const POSTS: Post[] = [
  {
    slug: "why-your-myte-confirms-before-it-writes",
    category: "Product",
    title: "Why your Myte confirms before it writes",
    excerpt:
      "A Myte that records decisions silently is a liability. Nothing in Mytheus becomes memory until a person says so. Here is the thinking behind the confirm step, and why it makes the record more trustworthy without making it slower.",
    date: "2026-10-28",
    author: TEAM,
    body: [
      "Every meeting assistant can produce a list of decisions. The harder question is whether anyone on the team would stake their week on that list. In our early builds the answer was no, and the reason was simple: the software decided what had been decided.",
      { h: "Hearing a decision is not the same as making one" },
      "People think out loud. \"Let's just ship it on the 12th\" can be a decision, a proposal, or a joke, and the only people who know which are the ones in the room. A model that writes all three down as fact produces a record that is confidently wrong some of the time, and a record that is wrong some of the time gets checked all of the time. At that point it has saved nobody anything.",
      "So we split the work. Your Myte listens and notices: this sounded like a decision, this sounded like something Raj took on. It holds each one as a card in your sidebar. It does not write it anywhere durable.",
      { h: "What Confirm actually does" },
      "When you press Confirm, three things happen: the decision is saved against the meeting, it is linked to the moment in the transcript where it was said, and it joins your team's memory, where future meetings can find it. Until then it is only a suggestion, and if you dismiss it, it is gone.",
      { quote: "The server decides what is true. A person decides what is worth keeping." },
      "This is also why a dropped connection never loses anything. Suggestions stream to you live, but the confirmed record lives on the server, so reloading the page brings back exactly what you agreed and nothing you did not.",
      { h: "Is it slower?" },
      "One click per decision, and most meetings only produce a handful. In return, the minutes that go out afterwards need no review pass, because every line in them was approved by someone who was there. The alternative is notes that someone has to read against their own memory before trusting them, which is the work the notes were meant to remove.",
      "Confirm is the smallest amount of human judgement we could ask for, placed at the one moment a human is best placed to give it.",
    ],
  },
  {
    slug: "a-decision-on-monday-is-context-on-friday",
    category: "Memory",
    title: "A decision on Monday is context on Friday",
    excerpt:
      "The point of meeting memory is not a tidy transcript. It is that what you agreed last week shows up at the moment this week's conversation needs it.",
    date: "2026-10-09",
    author: TEAM,
    body: [
      "Most teams do not have a note-taking problem. They have a recall problem. The notes exist, in a document nobody reopens, and the same question gets settled again three weeks later by people who half remember the first answer.",
      { h: "Memory is a set of links" },
      "When a decision is confirmed in Mytheus it is stored with what it connects to: the meeting, the people who were there, the project it touches, and any earlier decision it changes. A transcript is a record of what was said. These links are a record of what it meant.",
      "That is what lets a Myte do something a search box cannot. During Friday's planning call, when someone proposes moving the launch, your Myte already knows that Monday's review fixed the date and why, and it puts that in front of you before the conversation goes any further.",
      { h: "What surfaces, and when" },
      { list: [
        "A decision that today's discussion contradicts shows up as a red card, pinned above everything else.",
        "Something you promised that is now due shows up before the meeting starts, not after.",
        "Background you missed, such as a meeting you were not in, arrives as a short brief with its sources.",
      ] },
      "Every one of these cites where it came from. You can open the meeting and the exact line, so you are never asked to trust a summary on its own.",
      { quote: "The best meeting memory is the kind you only notice when it stops you repeating yourself." },
      "The measure we care about is not how much Mytheus remembers. It is how rarely a team has the same conversation twice.",
    ],
  },
  {
    slug: "capture-a-call-without-a-bot",
    category: "Product",
    title: "Capture a call without a bot in the room",
    excerpt:
      "Not every meeting happens in Mytheus. Capture brings calls on Google Meet, Microsoft Teams and Zoom into the same memory, from your own browser tab, with nothing extra joining the call.",
    date: "2026-09-22",
    author: TEAM,
    body: [
      "A meeting platform of your own only helps with the meetings you host. Plenty of calls happen on a link somebody else sent. The usual answer is a bot that joins as an extra participant. We did not want to build that. A stranger in the participant list changes how people talk, and it puts the decision to record in the hands of software.",
      { h: "How Capture works" },
      "Capture is a Chrome extension. When you are on a call in the browser and choose to start, it records two things: the meeting tab's audio, which is everyone else, and your microphone, which is you. Other speakers are told apart as Speaker 1, Speaker 2 and so on. You keep hearing the call as usual.",
      "The captured call becomes an ordinary Mytheus meeting. Your Myte takes notes on it, decisions wait for you to confirm them, and the minutes read the same as any other.",
      { h: "Consent comes first, every time" },
      { list: [
        "Before each capture, Mytheus asks you to confirm you have told everyone on the call.",
        "That confirmation is kept with the meeting.",
        "You get a short note to paste into the chat so nobody has to take your word for it.",
        "A bar on the meeting page shows that capture is running, for as long as it runs.",
      ] },
      "Capture stops when you press Stop, leave the call or close the tab. It does not run in the background and it never starts on its own.",
      { h: "What it does not do" },
      "It works in Chrome on a computer. The Zoom desktop app is not supported, so join from the browser instead. We would rather say that plainly than have you find out halfway through a call.",
    ],
  },
  {
    slug: "shorthand-in-minutes-out",
    category: "Craft",
    title: "Shorthand in, minutes out",
    excerpt:
      "You type three words. Your Myte turns them into a clean, attributed line. Here is how we keep the polish without inventing anything you did not say.",
    date: "2026-09-04",
    author: TEAM,
    body: [
      "Nobody writes good notes while also taking part in a meeting. What people actually type is closer to \"pricing 20% ok, raj deck\". That is a perfectly good note for the next ten minutes and a useless one by Thursday.",
      { h: "Expanding without inventing" },
      "When you jot shorthand in Mytheus, your Myte reads it next to the live transcript and writes the line you meant: \"Agreed annual plans at 20% off. Raj updates the deck.\" Every expanded line has to be supported by something that was said. If the transcript does not back it up, the line stays as you typed it.",
      "That constraint matters more than fluency. A note that reads beautifully and is slightly wrong is worse than three honest words.",
      { h: "Attribution is the hard part" },
      "\"Raj deck\" only becomes an action item if we know who Raj is, that he was in the meeting, and that he said yes. Your Myte checks all three against the participant list and the transcript. If it is unsure who took something on, it asks you instead of guessing.",
      { quote: "If the transcript does not back it up, the line stays as you typed it." },
      { h: "What you get afterwards" },
      "Minutes with three sections: what was decided, who is doing what, and what is still open. Each line links back to the moment it came from. They are short on purpose, because the transcript is always one click away for anyone who wants the detail.",
    ],
  },
  {
    slug: "one-myte-per-person",
    category: "Teams",
    title: "Why everyone gets their own Myte",
    excerpt:
      "Not one bot for the room. One Myte per participant, working for that person, and comparing notes with the others when it helps.",
    date: "2026-08-19",
    author: TEAM,
    body: [
      "A single assistant for the whole meeting has to write one set of notes for everybody. But the engineer, the designer and the account lead did not attend the same meeting. They sat in the same call and listened for different things.",
      { h: "Notes shaped by your role" },
      "Your Myte knows what you work on, so it keeps what matters to you: the constraint that affects your sprint, the promise made on your behalf, the question that only you can answer. Someone else's Myte keeps a different page from the same hour, and both are right.",
      { h: "Questions before the moment passes" },
      "While the conversation is live, your Myte can suggest a question worth asking: the deadline nobody stated, the owner nobody named. You decide whether to ask it. Most of the value of a meeting is lost in the thirty seconds after someone thinks \"I should have asked\".",
      { h: "Comparing notes" },
      "Mytes on the same team can settle small things between themselves. If you need a status from a colleague, your Myte asks theirs, and theirs answers only from what that colleague has already approved for sharing. Anything beyond that goes to the person.",
      { list: [
        "Your notes are yours until you share them.",
        "A Myte answers for you only with answers you have approved.",
        "Every exchange between Mytes is visible to both people involved.",
      ] },
      "The result is a meeting where each person leaves with their own record, and the team still ends up with one shared set of decisions.",
    ],
  },
  {
    slug: "captions-in-under-two-seconds",
    category: "Engineering",
    title: "Captions in under two seconds",
    excerpt:
      "Live captions feel instant or they feel broken. A look at the path a spoken word takes to reach your screen, and what we refuse to drop on a slow connection.",
    date: "2026-08-03",
    author: TEAM,
    body: [
      "We hold ourselves to one number for the live room: a spoken word appears as a caption in under two seconds. Past that, captions trail the conversation and people stop reading them.",
      { h: "Two planes, kept apart" },
      "Audio and video travel over a media connection built for it. Everything else that is live, such as captions, your Myte's cards, presence and chat, travels over a separate realtime connection. Keeping them apart means a busy sidebar can never make someone's voice stutter.",
      { h: "Interim and final" },
      "Speech recognition revises itself as it hears more. We show those interim words straight away and replace them when the final version arrives, in place, so the text never jumps. Only finals are saved. An interim caption is a preview, and we treat it as disposable.",
      { h: "What gets dropped first" },
      "On a poor connection something has to give, and we chose the order deliberately:",
      { list: [
        "The word by word animation of a Myte's card goes first. The finished card still arrives.",
        "Captions are never dropped.",
        "Anything you confirmed is never dropped, because it was saved on the server before you saw it.",
      ] },
      { quote: "The live connection carries nothing that only exists there." },
      "If your connection drops entirely, the room reconnects and reloads its history from the saved record. You may miss an animation. You will not miss a decision.",
    ],
  },
  {
    slug: "building-a-meeting-platform-not-a-bot",
    category: "Engineering",
    title: "Building a meeting platform, not a bot",
    excerpt:
      "Adding an assistant to someone else's call has a ceiling. Owning the meeting from the first frame is what lets Mytes work for each person, in real time.",
    date: "2026-07-14",
    author: TEAM,
    body: [
      "The quickest way to build a meeting assistant is to join other people's calls as a participant and transcribe what you hear. We started there, and then stopped, because of what that position cannot do.",
      { h: "What a guest cannot see" },
      "A bot in the call gets one mixed audio stream and whatever the host platform chooses to expose. It cannot reliably know who is speaking, it cannot show each person something different, and it finds out the meeting has ended when it is removed.",
      { h: "What owning the room gives you" },
      { list: [
        "A separate audio track per person, so attribution is a fact and not an estimate.",
        "A sidebar that is private to each participant, which is the whole idea of a personal Myte.",
        "Consent built into joining, with everyone told before anything is transcribed.",
        "A clear end to the meeting, so minutes go out when it finishes and not an hour later.",
      ] },
      "It is more to build: video, captions, reconnection, device checks, all of it. But it is the only version where the assistant is part of the meeting and not a listener at the door.",
      { h: "And when the call is somewhere else" },
      "We still meet people where they are. Capture brings calls from Google Meet, Microsoft Teams and Zoom into Mytheus from your own browser, without a bot. You get less than in a native Mytheus room, since speakers are numbered and not named, and we say so in the product.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-28" as "28 Oct 2026". Parsed by hand so it reads the same in every time zone. */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole minutes at 220 words a minute, never under one. */
export function readMinutes(post: Post): number {
  const words = post.body
    .map((b) => (typeof b === "string" ? b : "h" in b ? b.h : "quote" in b ? b.quote : b.list.join(" ")))
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}
