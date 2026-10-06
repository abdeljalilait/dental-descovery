import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ClinicCard } from "@/components/directory/clinic-card";
import { FinalCtaSection } from "@/components/landing/final-cta";
import { StructuredData } from "@/components/seo/structured-data";
import { breadcrumbSchema, graph, websiteSchema } from "@/lib/seo/schema";
import {
  getCitiesWithSpecialtyDb,
  getClinicCountBySpecialtyDb,
  getSpecialtyDb,
} from "@/lib/repositories/specialties";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getClinicsBySpecialtyDb } from "@/lib/repositories/clinics";
import { getBlogArticlesBySpecialtyDb } from "@/lib/repositories/blog";
import { cityPath, localizedPath, treatmentPath, blogPostPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang: localeValue, slug } = await params;
  const specialty = await getSpecialtyDb(slug);
  if (!specialty) return {};
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const title =
    locale === "ar"
      ? `${specialty.name.ar} في المغرب`
      : `${specialty.name.fr} au Maroc`;
  return {
    title: { absolute: `${title} — ${locale === "ar" ? "العيادات والأسعار" : "Cliniques et conseils"}` },
    description: specialty.description[locale],
    alternates: {
      canonical: treatmentPath(locale, slug),
      languages: { fr: treatmentPath("fr", slug), ar: treatmentPath("ar", slug), "x-default": treatmentPath("fr", slug) },
    },
  };
}

export default async function TreatmentPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang: localeValue, slug } = await params;
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const specialty = await getSpecialtyDb(slug);
  if (!specialty) notFound();

  const [relatedClinics, citySlugsWithSpecialty, countsBySpecialty, allCities, relatedPosts] =
    await Promise.all([
      getClinicsBySpecialtyDb(slug, 6),
      getCitiesWithSpecialtyDb(slug),
      getClinicCountBySpecialtyDb(),
      getCitiesDb(),
      getBlogArticlesBySpecialtyDb(slug, 2),
    ]);

  // The headline figure is the real total, not the size of the grid below it.
  const totalClinicsForSpecialty = countsBySpecialty[slug] ?? 0;
  const withSpecialty = new Set(citySlugsWithSpecialty);
  const citiesWithSpecialty = allCities.filter((city) => withSpecialty.has(city.slug));

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          breadcrumbSchema([
            { name: dict.nav.home, path: `/${locale}` },
            { name: dict.nav.treatments, path: localizedPath("treatments", locale) },
            { name: specialty.name[locale], path: treatmentPath(locale, slug) },
          ])
        )}
      />
      <PageHero
        eyebrow={dict.specialtiesSection.eyebrow}
        title={specialty.name[locale]}
        subtitle={specialty.description[locale]}
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.treatments, href: localizedPath("treatments", locale) },
          { label: specialty.name[locale] },
        ]}
      />

      <Section>
        <Container>
          {relatedClinics.length > 0 ? (
            <>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-foreground">
                  {dict.treatmentsPage.seeClinics} — {dict.treatmentsPage.citiesWith}
                </h2>
                <p className="text-sm text-muted">
                  {totalClinicsForSpecialty} {dict.common.clinics}
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relatedClinics.map((clinic) => (
                  <ClinicCard
                    key={`${clinic.citySlug}-${clinic.slug}`}
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
            </>
          ) : null}

          <div className="mt-14 rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-soft">
            <h2 className="text-xl font-extrabold text-foreground">{dict.treatmentsPage.citiesWith}</h2>
            <ul className="mt-5 flex flex-wrap gap-2.5">
              {citiesWithSpecialty.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`${cityPath(locale, city.slug)}?spec=${slug}`}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-border/80 bg-surface-subtle px-4 py-2 text-xs sm:text-sm font-bold text-foreground transition-all hover:border-primary hover:bg-primary-soft hover:text-primary shadow-xs"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden />
                    <span>{locale === "ar" ? city.nameAr : city.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {relatedPosts.length > 0 ? (
            <div className="mt-14">
              <h2 className="text-xl font-extrabold text-foreground">{dict.blogPage.relatedLinks}</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {relatedPosts.map((post) => (
                  <li key={post.slug}>
                    <Link
                      href={blogPostPath(locale, post.slug)}
                      className="group block rounded-2xl border border-border/80 bg-surface p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
                    >
                      <span className="rounded-pill bg-primary-soft px-2.5 py-0.5 text-xs font-extrabold text-primary">
                        {post.category[locale]}
                      </span>
                      <p className="mt-3 text-base font-extrabold text-foreground transition-colors group-hover:text-primary">
                        {post.title[locale]}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Container>
      </Section>

      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
