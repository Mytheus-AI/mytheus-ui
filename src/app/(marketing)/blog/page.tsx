import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Loop } from "@/components/site/Loop";
import { Chip, Section, SectionHead, Stage, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { ConfirmWin } from "@/components/company/ConfirmWin";
import { POSTS, formatPostDate, readMinutes } from "@/lib/marketing/posts";

export const metadata: Metadata = {
  title: "Blog | Mytheus",
  description: "Product notes, the craft behind meeting memory, and how the room is built, from the team that makes Mytheus.",
};

/* The blog index: the newest post on a stage beside the confirm window, then every other post
   as an aligned row (date, title and excerpt, topic and reading time). Each row is one link to
   the post's page. Content lives in src/lib/marketing/posts.ts. */

const TOPICS = Array.from(new Set(POSTS.map((p) => p.category)));

export default function Page() {
  const [featured, ...rest] = POSTS;

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title={
          <>
            Notes from the <Loop>Mytheus team.</Loop>
          </>
        }
        blurb="Product notes, the craft behind meeting memory, and how the room is built. Written by the people who make it."
      />

      {/* the newest post */}
      <section aria-labelledby="featured-title" className="pb-[clamp(64px,9vw,120px)]">
        <Wrap>
          <Stage>
            <article className="grid items-center gap-[clamp(24px,4vw,56px)] md:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
              <div className="px-1 md:px-2">
                <p className="flex flex-wrap items-center gap-3">
                  <Chip tone="accent">{featured.category}</Chip>
                  <span className="text-[14px] font-semibold text-ink-2">Latest</span>
                </p>
                <h2 id="featured-title" className="display mt-5 text-[clamp(2rem,4vw,3rem)]">
                  <Link
                    href={`/blog/${featured.slug}`}
                    className="decoration-signal-line decoration-2 underline-offset-[8px] hover:underline"
                  >
                    {featured.title}
                  </Link>
                </h2>
                <p className="mt-5 max-w-[50ch] text-[17px] leading-relaxed text-ink-2">{featured.excerpt}</p>
                <p className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-2">
                  <span className="font-semibold text-ink">{featured.author}</span>
                  <time dateTime={featured.date}>{formatPostDate(featured.date)}</time>
                  <span>{readMinutes(featured)} min read</span>
                </p>
                <Link
                  href={`/blog/${featured.slug}`}
                  className="mt-7 inline-flex h-12 items-center rounded-ctl bg-pill px-[22px] text-[16px] font-semibold text-pill-on transition-[background-color,box-shadow] hover:bg-pill-2 hover:shadow-warm-2"
                >
                  Read the post
                </Link>
              </div>
              <ConfirmWin />
            </article>
          </Stage>
        </Wrap>
      </section>

      <Section cross>
        <Wrap>
          <SectionHead
            title="More from the team."
            lead={
              <>
                {rest.length} more posts on {TOPICS.slice(0, -1).join(", ").toLowerCase()} and{" "}
                {TOPICS[TOPICS.length - 1].toLowerCase()}, newest first.
              </>
            }
          />
          <ul className="border-b border-line-2">
            {rest.map((post) => (
              <li key={post.slug} className="border-t border-line-2">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group -mx-4 grid gap-x-10 gap-y-2 rounded-card px-4 py-7 transition-colors duration-150 hover:bg-surface-2 md:grid-cols-[120px_minmax(0,1fr)_150px] md:py-8"
                >
                  <p className="text-[15px] text-ink-3 md:pt-1.5">
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                  </p>
                  <div>
                    <h3 className="font-display text-[clamp(1.45rem,2.4vw,1.85rem)] font-medium leading-tight tracking-[-0.015em] text-ink decoration-signal-line decoration-2 underline-offset-[6px] group-hover:underline">
                      {post.title}
                    </h3>
                    <p className="mt-2.5 max-w-[62ch] text-[16px] leading-relaxed text-ink-3">{post.excerpt}</p>
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:flex-col md:items-end md:pt-1.5">
                    <Chip>{post.category}</Chip>
                    <span className="text-[14px] text-ink-3">{readMinutes(post)} min read</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      <CloseCTA
        title="Every meeting, on repeat."
        lead="The best way to follow what we are building is to use it. Start a meeting and see what your Myte keeps."
      />
    </>
  );
}
