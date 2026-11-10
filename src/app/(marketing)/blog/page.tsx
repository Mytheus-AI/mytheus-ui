import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { ConfirmWin } from "@/components/company/ConfirmWin";

export const metadata: Metadata = {
  title: "Blog | Mytheus",
  description: "Product updates, the craft behind meeting memory, and how teams get more out of every conversation.",
};

/* Static, on-brand sample content. No post routes exist yet, so posts render as articles, not
   links (no dead hrefs). When post pages land, wrap each row's title in a Link. */

const featured = {
  category: "Product",
  title: "Why your agent confirms before it writes",
  excerpt:
    "A personal agent that records decisions silently is a liability. We designed Mytheus so nothing becomes memory until you say so. Here is the thinking behind the confirm step, and why it makes the notes more trustworthy, not slower.",
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
      "Most notes die in a doc nobody reopens. We treat every meeting as something your agents carry forward, and that changes how you capture it.",
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
      "Not one bot for the room: one agent per participant, working for you, and quietly comparing notes with the others when it helps.",
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
      "An action from standup, a decision from the review, a question left open last sprint: your agents reconcile them so you don't have to.",
    date: "Apr 2026",
    readTime: "5 min read",
  },
];

export default function Page() {
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Notes from the <Loop>Mytheus team.</Loop>
          </>
        }
        blurb="Product updates, the craft behind meeting memory, and how teams get more out of every conversation."
      />

      {/* the featured post */}
      <section aria-labelledby="featured-title" className="pb-[clamp(64px,9vw,120px)]">
        <Wrap>
          <Stage>
            <article className="grid items-center gap-[clamp(24px,4vw,56px)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
              <div className="px-1 md:px-2">
                <p className="flex flex-wrap items-center gap-3">
                  <Chip tone="accent">{featured.category}</Chip>
                  <span className="text-[14px] font-semibold text-ink-3">Featured</span>
                </p>
                <h2 id="featured-title" className="display mt-5 text-[clamp(2rem,4vw,3rem)]">
                  {featured.title}
                </h2>
                <p className="mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-2">{featured.excerpt}</p>
                <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-3">
                  <span className="font-semibold text-ink-2">{featured.author}</span>
                  <span>{featured.date}</span>
                  <span>{featured.readTime}</span>
                </p>
              </div>
              <ConfirmWin />
            </article>
          </Stage>
        </Wrap>
      </section>

      <Section cross>
        <Wrap>
          <SectionHead title="More from the team." lead="Memory, craft, engineering, and the thinking behind the product." />
          <ul className="border-b border-line-2">
            {posts.map((post) => (
              <li key={post.title} className="border-t border-line-2">
                <article className="grid gap-x-10 gap-y-2 py-7 md:grid-cols-[120px_minmax(0,1fr)_150px] md:py-8">
                  <p className="text-[15px] text-ink-3 md:pt-1.5">
                    <time>{post.date}</time>
                  </p>
                  <div>
                    <h3 className="font-display text-[clamp(1.45rem,2.4vw,1.85rem)] font-medium leading-tight tracking-[-0.015em] text-ink">
                      {post.title}
                    </h3>
                    <p className="mt-2.5 max-w-[62ch] text-[16px] leading-relaxed text-ink-3">{post.excerpt}</p>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:flex-col md:items-end md:pt-1.5">
                    <Chip>{post.category}</Chip>
                    <span className="text-[14px] text-ink-3">{post.readTime}</span>
                  </p>
                </article>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      <CloseCTA
        title="Every meeting, on repeat."
        lead="New writing lands here as the product grows. Start using Mytheus and see what your agents remember."
      />
    </>
  );
}
