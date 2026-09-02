import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getBlogPosts } from "@/lib/data/blog";
import { blogPostPath, localizedPath } from "@/lib/routes";

export function BlogHighlightsSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const posts = getBlogPosts().slice(0, 3);

  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow={dict.blogSection.eyebrow}
          title={dict.blogSection.title}
          subtitle={dict.blogSection.subtitle}
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={blogPostPath(locale, post.slug)}
              className="group flex h-full flex-col rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lift"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-primary font-bold">{post.category[locale]}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                  {post.readTime} {dict.common.minRead}
                </span>
              </div>
              <h3 className="mt-4 text-base sm:text-lg font-black leading-snug text-foreground transition-colors group-hover:text-primary">
                {post.title[locale]}
              </h3>
              <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-relaxed text-muted">{post.excerpt[locale]}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary-dark">
                <span>{dict.common.readMore}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" strokeWidth={2.2} aria-hidden />
              </span>
            </Link>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href={localizedPath("blog", locale)}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary-dark underline underline-offset-4"
          >
            <span>{dict.blogSection.allCta}</span>
          </Link>
        </div>
      </Container>
    </Section>
  );
}
