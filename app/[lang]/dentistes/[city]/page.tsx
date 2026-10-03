import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ClinicCard } from "@/components/directory/clinic-card";
import { CityCard } from "@/components/directory/city-card";
import { FinalCtaSection } from "@/components/landing/final-cta";
import { StructuredData } from "@/components/seo/structured-data";
import { breadcrumbSchema, graph, itemListSchema, websiteSchema } from "@/lib/seo/schema";
import { cityDisplayName } from "@/lib/utils/city-display";
import { getCitiesDb, getCityDb, getCitySlugsDb } from "@/lib/repositories/cities";
import { getClinicsByCityDb } from "@/lib/repositories/clinics";
import { getClinicCountByCityDb } from "@/lib/repositories/stats";
import { getSpecialtiesDb } from "@/lib/repositories/specialties";
import { cityPath, localizedPath, treatmentPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";

export const dynamicParams = false;

/** Clinic data refreshes on the monthly SerpApi sync, so revalidate hourly. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getCitySlugsDb();
  return locales.flatMap((locale) => slugs.map((city) => ({ lang: locale, city })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; city: string }>;
}): Promise<Metadata> {
  const { lang: localeValue, city: citySlug } = await params;
  const city = await getCityDb(citySlug);
  if (!city) return {};
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const inCity = locale === "ar" ? `أطباء الأسنان في ${city.nameAr}` : `Dentistes à ${city.name}`;
  return {
    title: { absolute: `${inCity} — ${locale === "ar" ? "دليل العيادات" : "Annuaire des cliniques"}` },
    description: city.seoIntro[locale],
    alternates: {
      canonical: cityPath(locale, city.slug),
      languages: { fr: cityPath("fr", city.slug), ar: cityPath("ar", city.slug), "x-default": cityPath(locale, city.slug) },
    },
  };
}

export default async function CityDentistsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; city: string }>;
  searchParams: Promise<{ spec?: string }>;
}) {
  const { lang: localeValue, city: citySlug } = await params;
  const { spec } = await searchParams;
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const city = await getCityDb(citySlug);
  if (!city) notFound();

  const cityName = cityDisplayName(city, locale);
  const [allClinics, specialties, allCities, countsByCity] = await Promise.all([
    getClinicsByCityDb(city.slug),
    getSpecialtiesDb(),
    getCitiesDb(),
    getClinicCountByCityDb(),
  ]);
  const activeSpecialty = spec && specialties.some((s) => s.slug === spec) ? spec : null;
  const clinics = activeSpecialty
    ? allClinics.filter((c) => c.specialtySlugs.includes(activeSpecialty))
    : allClinics;

  const inCity = locale === "ar" ? `${dict.dentistsPage.inCity} ${cityName}` : `${dict.dentistsPage.inCity} ${cityName}`;
  const nearby = allCities
    .filter((c) => c.slug !== city.slug && c.region[locale] === city.region[locale])
    .slice(0, 3);

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          breadcrumbSchema([
            { name: dict.nav.home, path: `/${locale}` },
            { name: dict.nav.dentists, path: localizedPath("dentists", locale) },
            { name: cityName, path: cityPath(locale, city.slug) },
          ]),
          itemListSchema(clinics, locale, city.slug)
        )}
      />
      <PageHero
        eyebrow={city.region[locale]}
        title={inCity}
        subtitle={city.seoIntro[locale]}
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.dentists, href: localizedPath("dentists", locale) },
          { label: cityName },
        ]}
      >
        <p className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
          <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          {allClinics.length} {dict.dentistsPage.clinicsFound} · {city.populationNote[locale]}
        </p>
      </PageHero>

      <Section>
        <Container>
          <nav aria-label={dict.dentistsPage.filterBySpecialty} className="mb-8 flex flex-wrap gap-2">
            <Link
              href={cityPath(locale, city.slug)}
              scroll={false}
              className={cn(
                "inline-flex h-10 items-center rounded-pill border px-4 text-sm font-semibold transition-colors",
                !activeSpecialty
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary"
              )}
            >
              {dict.common.allSpecialties}
            </Link>
            {specialties.map((specialty) => {
              const count = allClinics.filter((c) => c.specialtySlugs.includes(specialty.slug)).length;
              if (count === 0) return null;
              const active = activeSpecialty === specialty.slug;
              return (
                <Link
                  key={specialty.slug}
                  href={`${cityPath(locale, city.slug)}?spec=${specialty.slug}`}
                  scroll={false}
                  className={cn(
                    "inline-flex h-10 items-center rounded-pill border px-4 text-sm font-semibold transition-colors",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-foreground hover:border-primary/50 hover:text-primary"
                  )}
                >
                  {specialty.name[locale]}
                </Link>
              );
            })}
          </nav>

          {clinics.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {clinics.map((clinic) => (
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
          ) : (
            <p className="rounded-card border border-border bg-surface p-8 text-center text-muted">
              {dict.dentistsPage.noClinicsForSpecialty}
            </p>
          )}

          {nearby.length > 0 ? (
            <div className="mt-16">
              <h2 className="text-xl font-bold text-foreground">{dict.dentistsPage.nearbyCities}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nearby.map((nearCity) => (
                  <CityCard
                    key={nearCity.slug}
                    city={nearCity}
                    locale={locale}
                    exploreLabel={dict.citiesSection.exploreCity}
                    clinicsLabel={dict.common.clinics}
                    clinicCount={countsByCity[nearCity.slug] ?? 0}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-16 rounded-card border border-border bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-bold text-foreground">
              {dict.dentistsPage.relatedTreatments} {cityName}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {specialties.slice(0, 6).map((specialty) => (
                <li key={specialty.slug}>
                  <Link
                    href={`${treatmentPath(locale, specialty.slug)}`}
                    className="inline-flex items-center gap-1.5 rounded-pill border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Check className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} aria-hidden />
                    {specialty.name[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
