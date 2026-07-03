import type { Metadata } from "next";
import { PageShell } from "@/components/marketing/PageShell";
import { PageHero } from "@/components/marketing/PageHero";
import { PillCTA } from "@/components/landing/ui";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/motion";

export const metadata: Metadata = {
  title: "Blog — Mytheus",
  description:
    "Product updates, the craft behind meeting memory, and how teams get more out of every conversation.",
};

/* ------------------------------------------------------------------ */
/*  Static, on-brand sample content. No detail routes exist yet, so    */
/*  cards are rendered as non-link <article> elements (no dead hrefs).  */
/* ------------------------------------------------------------------ */

const featured = {
  category: "Product",
  title: "Why your agent confirms before it writes",
  excerpt:
    "A personal agent that records decisions silently is a liability. We designed Mytheus so nothing becomes memory until you say so — here is the thinking behind the confirm step, and why it makes the notes more trustworthy, not slower.",
  author: "The Mytheus team",
  date: "Jun 2026",
  readTime: "6 min read",
};

const posts = [
  {
    category: "Memory",
    title: "A decision on Monday is context on Friday",
    excerpt:
      "The point of meeting memory isn't a tidy transcript. It's that what you agreed last week shows up exactly when this week's conversation needs it.",
    date: "Jun 2026",
    readTime: "5 min read",
  },
  {
    category: "Craft",
    title: "Designing memory that survives the meeting",
    excerpt:
      "Most notes die in a doc nobody reopens. We treat every meeting as something your agents carry forward — and that changes how you capture it.",
    date: "Jun 2026",
    readTime: "7 min read",
  },
  {
    category: "Product",
    title: "Shorthand in, minutes out",
    excerpt:
      "You scribble three words; your agent turns them into a clean, attributed line. Here's how we keep the polish without inventing what you didn't say.",
    date: "May 2026",
    readTime: "4 min read",
  },
  {
    category: "Philosophy",
    title: "What we mean by a personal agent for everyone",
    excerpt:
      "Not one bot for the room — one agent per participant, working for you, and quietly comparing notes with the others when it helps.",
    date: "May 2026",
    readTime: "6 min read",
  },
  {
    category: "Engineering",
    title: "Building a meeting platform, not a bot",
    excerpt:
      "Bolting AI onto someone else's call has a ceiling. Owning the meeting end to end is what lets agents collaborate across conversations.",
    date: "May 2026",
    readTime: "8 min read",
  },
  {
    category: "Teams",
    title: "When agents compare notes across meetings",
    excerpt:
      "An action from standup, a decision from the review, a question left open last sprint — your agents reconcile them so you don't have to.",
    date: "Apr 2026",
    readTime: "5 min read",
  },
];

/* A tasteful, token-only abstract panel: a soft signal field with a few
   stacked "note" lines and a small agent dot — no external images. */
function FeaturedVisual() {
  return (
    <div className="relative isolate hidden overflow-hidden rounded-[22px] border border-line bg-signal-soft md:block">
      <div className="mesh-field absolute inset-0 opacity-70" aria-hidden />
      <div className="relative flex h-full min-h-[320px] flex-col justify-center gap-5 p-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-signal text-[13px] font-medium text-white">
            R
          </span>
          <span className="h-2.5 w-28 rounded-pill bg-line-2" />
        </div>
        <div className="space-y-3 rounded-card border border-line bg-white/70 p-6 backdrop-blur-sm">
          <span className="block h-2.5 w-4/5 rounded-pill bg-line-2" />
          <span className="block h-2.5 w-full rounded-pill bg-line-2" />
          <span className="block h-2.5 w-2/3 rounded-pill bg-signal/30" />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-pill bg-signal-soft px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-signal-deep">
            Decision
          </span>
          <span className="h-2.5 w-20 rounded-pill bg-line-2" />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Blog"
        title="Notes from the Mytheus team."
        blurb="Product updates, the craft behind meeting memory, and how teams get more out of every conversation."
      />

      {/* Featured post */}
      <section className="mx-auto max-w-[1340px] px-6 sm:px-8 py-20 sm:py-24">
        <Reveal>
          <article className="card-interactive grid items-stretch gap-8 rounded-card border border-line bg-white p-7 sm:p-9 md:grid-cols-2 md:gap-10">
            <div className="flex flex-col justify-center">
              <p className="kicker text-signal">{featured.category}</p>
              <h2 className="display-tight mt-5 text-balance text-[clamp(1.9rem,3.4vw,2.9rem)] text-ink-display">
                {featured.title}
              </h2>
              <p className="mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-3">
                {featured.excerpt}
              </p>
              <p className="mt-7 text-[13px] text-ink-3">
                <span className="text-ink-2">{featured.author}</span>
                <span className="px-2 text-line-2">·</span>
                {featured.date}
                <span className="px-2 text-line-2">·</span>
                {featured.readTime}
              </p>
            </div>
            <FeaturedVisual />
          </article>
        </Reveal>
      </section>

      {/* Post grid */}
      <section className="mx-auto max-w-[1340px] px-6 sm:px-8 pb-20 sm:pb-24">
        <Reveal>
          <p className="kicker text-signal">Latest</p>
          <h2 className="display-tight mt-4 text-[clamp(1.6rem,2.6vw,2.2rem)] text-ink-display">
            More from the team
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <StaggerItem key={post.title} className="h-full">
              <article className="card-interactive flex h-full flex-col rounded-card border border-line bg-white p-7">
                <span className="inline-flex w-fit rounded-pill bg-signal-soft px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-signal-deep">
                  {post.category}
                </span>
                <h3 className="mt-5 text-[20px] font-medium leading-snug tracking-[-0.01em] text-ink-display">
                  {post.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-ink-3">
                  {post.excerpt}
                </p>
                <p className="mt-auto pt-6 text-[13px] text-ink-3">
                  {post.date}
                  <span className="px-2 text-line-2">·</span>
                  {post.readTime}
                </p>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Subscribe band */}
      <section className="mx-auto max-w-[1340px] px-6 sm:px-8 pb-24 sm:pb-28">
        <Reveal>
          <div className="mesh-field grain relative overflow-hidden rounded-card border border-line px-8 py-14 sm:px-14 sm:py-16">
            <div className="relative max-w-[34ch]">
              <p className="kicker text-signal">Follow along</p>
              <h2 className="display-tight mt-4 text-balance text-[clamp(1.8rem,3.2vw,2.6rem)] text-ink-display">
                Every meeting, on repeat.
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-3">
                New writing lands here as the product grows. Start using Mytheus
                and see what your agents remember.
              </p>
              <div className="mt-8">
                <PillCTA href="/dashboard">Get started free</PillCTA>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
