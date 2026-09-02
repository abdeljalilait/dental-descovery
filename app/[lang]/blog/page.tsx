import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { FinalCtaSection } from "@/components/landing/final-cta";
import { getBlogPosts } from "@/lib/data/blog";
import { blogPostPath, localizedPath } from "@/lib/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionaryFor("fr");
  return {
    title: dict.blogPage.title,
    description: dict.blogPage.subtitle,
    alternates: {
      canonical: localizedPath("blog", "fr"),
      languages: {
        fr: localizedPath("blog", "fr"),
        ar: localizedPath("blog", "ar"),
      },
    },
  };
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const posts = getBlogPosts();

  return (
    <>
      <PageHero
        eyebrow={dict.blogSection.eyebrow}
        title={dict.blogPage.title}
        subtitle={dict.blogPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.nav.blog }]}
      />
      <Section>
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={blogPostPath(locale, post.slug)}
                className="group flex h-full flex-col rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lift"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                  <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-primary font-extrabold">{post.category[locale]}</span>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                    {post.readTime} {dict.common.minRead}
                  </span>
                </div>
                <h2 className="mt-4 text-base sm:text-lg font-black leading-snug text-foreground transition-colors group-hover:text-primary">
                  {post.title[locale]}
                </h2>
                <p className="mt-2.5 flex-1 text-xs sm:text-sm leading-relaxed text-muted">{post.excerpt[locale]}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary-dark">
                  <span>{dict.common.readMore}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                    strokeWidth={2.2}
                    aria-hidden
                  />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </Section>
      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
