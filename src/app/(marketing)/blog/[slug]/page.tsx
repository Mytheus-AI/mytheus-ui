import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Prose } from "@/components/marketing/Prose";
import { Chip, Section, Wrap } from "@/components/site/Section";
import { CloseCTA } from "@/components/site/CloseCTA";
import { POSTS, formatPostDate, getPost, readMinutes, type PostBlock } from "@/lib/marketing/posts";

/* One blog post: a quiet reading page. Back link, topic, serif title, the excerpt as a standfirst
   and a byline row, then the body at reading width. The one pulled line in a post sits on a
   coral rule. Two more posts follow, then the closing panel. Statically generated per slug. */

type Params = { params: { slug: string } };

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const post = getPost(params.slug);
  if (!post) return { title: "Blog | Mytheus" };
  return { title: `${post.title} | Mytheus`, description: post.excerpt };
}

function Block({ block }: { block: PostBlock }) {
  if (typeof block === "string") return <p>{block}</p>;
  if ("h" in block) return <h2>{block.h}</h2>;
  if ("list" in block) {
    return (
      <ul>
        {block.list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <blockquote className="my-10 border-l-[3px] border-signal-line pl-6 font-display text-[clamp(1.45rem,2.6vw,1.9rem)] leading-[1.3] tracking-[-0.012em] text-ink">
      {block.quote}
    </blockquote>
  );
}

export default function Page({ params }: Params) {
  const post = getPost(params.slug);
  if (!post) notFound();

  const index = POSTS.indexOf(post);
  const more = [1, 2].map((step) => POSTS[(index + step) % POSTS.length]);

  return (
    <>
      <article className="pb-[clamp(56px,7vw,96px)] pt-[clamp(40px,5vw,72px)]">
        <Wrap>
          <div className="mx-auto max-w-[68ch]">
            <Link
              href="/blog"
              className="inline-flex min-h-10 items-center gap-2 text-[15px] font-semibold text-ink-3 transition-colors hover:text-ink"
            >
              <ArrowLeft size={16} aria-hidden />
              All posts
            </Link>

            <header className="mt-7 border-b border-line-2 pb-9">
              <Chip tone="accent">{post.category}</Chip>
              <h1 className="display mt-5 text-[clamp(2.4rem,5.4vw,4rem)] leading-[1.02] tracking-[-0.03em]">{post.title}</h1>
              <p className="mt-6 text-[clamp(1.1rem,1.7vw,1.3rem)] leading-relaxed text-ink-3">{post.excerpt}</p>
              <p className="mt-7 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-3">
                <span className="font-semibold text-ink">{post.author}</span>
                <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                <span>{readMinutes(post)} min read</span>
              </p>
            </header>

            <Prose className="mt-10">
              {post.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </Prose>
          </div>
        </Wrap>
      </article>

      <Section cross className="!pt-[clamp(48px,6vw,80px)]">
        <Wrap>
          <h2 className="display text-[clamp(1.8rem,3.4vw,2.5rem)]">Keep reading</h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-2">
            {more.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group flex h-full flex-col rounded-card border border-line bg-surface p-6 transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-warm-2 sm:p-7"
                >
                  <p className="flex flex-wrap items-center gap-3 text-[14px] text-ink-3">
                    <Chip>{p.category}</Chip>
                    <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                  </p>
                  <h3 className="mt-4 font-display text-[1.6rem] font-medium leading-tight tracking-[-0.015em] text-ink decoration-signal-line decoration-2 underline-offset-[6px] group-hover:underline">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-3">{p.excerpt}</p>
                  <p className="mt-auto pt-5 text-[14px] text-ink-3">{readMinutes(p)} min read</p>
                </Link>
              </li>
            ))}
          </ul>
        </Wrap>
      </Section>

      <CloseCTA
        title="See it in your next meeting."
        lead="Start a meeting in Mytheus, or capture one you are already in. Your Myte takes it from there."
      />
    </>
  );
}
