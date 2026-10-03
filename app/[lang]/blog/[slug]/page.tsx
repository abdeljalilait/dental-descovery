import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ClinicCard } from "@/components/directory/clinic-card";
import { ButtonLink } from "@/components/ui/button-link";
import { StructuredData } from "@/components/seo/structured-data";
import { articleSchema, breadcrumbSchema, graph, websiteSchema } from "@/lib/seo/schema";
import { getBlogArticleBySlugDb, getBlogSlugsDb } from "@/lib/repositories/blog";
import { getClinicsByCityDb } from "@/lib/repositories/clinics";
import { getCityDb } from "@/lib/repositories/cities";
import { blogPostPath, cityPath, localizedPath, treatmentPath } from "@/lib/routes";

export const dynamicParams = true;

/**
 * Published posts are re-read hourly. Drafts are never generated, and a post
 * published from the admin revalidates its own path on save.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getBlogSlugsDb();
  return locales.flatMap((lang) => slugs.map((slug) => ({ lang, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: localeValue, slug } = await params;
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const post = await getBlogArticleBySlugDb(slug);
  if (!post) return {};

  // Per-article overrides are nullable by design; each falls back to the post's
  // own title/excerpt so a partially filled SEO section still applies.
  const title = post.metaTitle[locale] || post.title[locale];
  const description = post.metaDescription[locale] || post.excerpt[locale];
  const keywords = post.keywords[locale];
  const ogImageUrl = post.ogImageUrl ?? post.coverImageUrl;

  return {
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: {
      canonical: blogPostPath(locale, slug),
      languages: { fr: blogPostPath("fr", slug), ar: blogPostPath("ar", slug) },
    },
    openGraph: {
      type: "article",
      title,
      description,
      publishedTime: post.date,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, alt: title }] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: localeValue, slug } = await params;
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const [dict, post] = await Promise.all([
    getDictionaryFor(locale),
    getBlogArticleBySlugDb(slug),
  ]);
  if (!post) notFound();

  const paragraphs = (post.content[locale] || "").split("\n\n");
  const city = post.relatedCitySlug ? await getCityDb(post.relatedCitySlug) : undefined;
  const cityClinics = city ? (await getClinicsByCityDb(city.slug)).slice(0, 3) : [];

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          articleSchema(
            { title: post.title[locale], excerpt: post.excerpt[locale], date: post.date, slug: post.slug },
            locale
          ),
          breadcrumbSchema([
            { name: dict.nav.home, path: `/${locale}` },
            { name: dict.nav.blog, path: localizedPath("blog", locale) },
            { name: post.title[locale], path: blogPostPath(locale, slug) },
          ])
        )}
      />
      <PageHero
        eyebrow={post.category[locale]}
        title={post.title[locale]}
        subtitle={post.excerpt[locale]}
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.blog, href: localizedPath("blog", locale) },
          { label: post.title[locale] },
        ]}
      >
        <p className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white/85 backdrop-blur-sm">
          <Clock className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          {post.readTime} {dict.common.minRead} · {new Date(post.date).toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-MA")}
        </p>
      </PageHero>

      <Section>
        <Container className="max-w-3xl">
          <article className="space-y-5">
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className={
                  i === 0
                    ? "text-lg leading-relaxed text-foreground first-letter:float-left first-letter:me-3 first-letter:text-5xl first-letter:font-extrabold first-letter:leading-[0.85] first-letter:text-primary"
                    : "leading-relaxed text-muted"
                }
              >
                {paragraph}
              </p>
            ))}
          </article>

          <div className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/40 via-surface to-surface p-6 sm:p-8 shadow-soft">
            <h2 className="text-base font-extrabold text-foreground">{dict.blogPage.relatedLinks}</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {city ? (
                <Link
                  href={cityPath(locale, city.slug)}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-border/80 bg-surface px-4 py-2 text-xs sm:text-sm font-bold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary shadow-xs"
                >
                  <span>{dict.dentistsPage.inCity} {locale === "ar" ? city.nameAr : city.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.2} aria-hidden />
                </Link>
              ) : null}
              {post.relatedSpecialtySlug ? (
                <Link
                  href={treatmentPath(locale, post.relatedSpecialtySlug)}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-border/80 bg-surface px-4 py-2 text-xs sm:text-sm font-bold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary shadow-xs"
                >
                  <span>{dict.treatmentsPage.seeClinics}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.2} aria-hidden />
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-8">
            <Link
              href={localizedPath("blog", locale)}
              className="group inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 rtl:rotate-180 rtl:group-hover:translate-x-1" strokeWidth={2} aria-hidden />
              {dict.common.backToBlog}
            </Link>
            <ButtonLink href={localizedPath("dentists", locale)} variant="primary">
              {dict.nav.dentists}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={2} aria-hidden />
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {cityClinics.length > 0 ? (
        <Section tone="surface">
          <Container>
            <h2 className="mb-8 text-2xl font-bold text-foreground">
              {dict.blogPage.relatedClinics} — {city ? (locale === "ar" ? city.nameAr : city.name) : ""}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cityClinics.map((clinic) => (
                <ClinicCard
                  key={clinic.slug}
                  clinic={clinic}
                  locale={locale}
                  dict={{
                    viewProfile: dict.common.viewProfile,
                    ratingSource: dict.common.ratingSource,
                    callNow: dict.common.callNow,
                  }}
                />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
