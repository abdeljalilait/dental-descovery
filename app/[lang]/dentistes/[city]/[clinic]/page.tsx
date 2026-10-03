import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock, ExternalLink, MapPin, Phone, MessageCircle } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ClinicCard } from "@/components/directory/clinic-card";
import { RatingValue } from "@/components/ui/rating";
import { VerifiedBadge, OnlineBookingBadge } from "@/components/ui/badges";
import { LeadModal } from "@/components/clinic/lead-modal";
import { StructuredData } from "@/components/seo/structured-data";
import { breadcrumbSchema, dentistSchema, graph, websiteSchema } from "@/lib/seo/schema";
import { cityDisplayName } from "@/lib/utils/city-display";
import { getCityDb, getCitySlugsDb } from "@/lib/repositories/cities";
import { getClinicDb, getClinicsByCityDb } from "@/lib/repositories/clinics";
import { clinicPath, cityPath, localizedPath } from "@/lib/routes";

export const dynamicParams = true;

/** Clinic data refreshes on the monthly SerpApi sync, so revalidate hourly. */
export const revalidate = 3600;

/** Prebuild the best-rated clinics per city; the rest render on demand and cache. */
const PREBUILT_PER_CITY = 10;

export async function generateStaticParams() {
  const citySlugs = await getCitySlugsDb();
  const perCity = await Promise.all(
    citySlugs.map(async (citySlug) => {
      const clinics = await getClinicsByCityDb(citySlug, PREBUILT_PER_CITY);
      return clinics.map((clinic) => ({ citySlug, slug: clinic.slug }));
    }),
  );

  const pairs = perCity.flat();
  return locales.flatMap((locale) =>
    pairs.map(({ citySlug, slug }) => ({ lang: locale, city: citySlug, clinic: slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; city: string; clinic: string }>;
}): Promise<Metadata> {
  const { lang: localeValue, city: citySlug, clinic: clinicSlug } = await params;
  const clinic = await getClinicDb(citySlug, clinicSlug);
  if (!clinic) return {};
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  return {
    title: { absolute: `${clinic.name} — ${locale === "ar" ? clinic.nameAr : cityDisplayName((await getCityDb(citySlug))!, locale)}` },
    description: clinic.description[locale],
    alternates: {
      canonical: clinicPath(locale, citySlug, clinicSlug),
      languages: { fr: clinicPath("fr", citySlug, clinicSlug), ar: clinicPath("ar", citySlug, clinicSlug) },
    },
  };
}

export default async function ClinicPage({
  params,
}: {
  params: Promise<{ lang: string; city: string; clinic: string }>;
}) {
  const { lang: localeValue, city: citySlug, clinic: clinicSlug } = await params;
  const locale = (locales as readonly string[]).includes(localeValue) ? (localeValue as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const clinic = await getClinicDb(citySlug, clinicSlug);
  const city = await getCityDb(citySlug);
  if (!clinic || !city) notFound();

  const cityName = cityDisplayName(city, locale);
  const clinicName = locale === "ar" ? clinic.nameAr : clinic.name;
  const others = (await getClinicsByCityDb(citySlug))
    .filter((c) => c.slug !== clinic.slug)
    .slice(0, 3);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`;

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          dentistSchema(clinic, locale, city.slug, cityName),
          breadcrumbSchema([
            { name: dict.nav.home, path: `/${locale}` },
            { name: dict.nav.dentists, path: localizedPath("dentists", locale) },
            { name: cityName, path: cityPath(locale, city.slug) },
            { name: clinic.name, path: clinicPath(locale, city.slug, clinic.slug) },
          ])
        )}
      />
      <PageHero
        eyebrow={cityName}
        title={clinicName}
        subtitle={clinic.neighborhood[locale]}
        crumbs={[
          { label: dict.nav.home, href: `/${locale}` },
          { label: dict.nav.dentists, href: localizedPath("dentists", locale) },
          { label: cityName, href: cityPath(locale, city.slug) },
          { label: clinicName },
        ]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-4 py-2 backdrop-blur-sm">
            <RatingValue
              rating={clinic.rating}
              reviewCount={clinic.reviewCount}
              source={dict.common.ratingSource}
              size={14}
              className="text-white [&_span]:text-white/85"
            />
          </span>
          {clinic.verified ? (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
              <VerifiedBadge locale={locale} className="!bg-transparent !text-white !p-0" />
            </span>
          ) : null}
          {clinic.usesApp ? (
            <span className="inline-flex items-center rounded-pill bg-white/10 px-4 py-2 backdrop-blur-sm">
              <OnlineBookingBadge locale={locale} className="!bg-transparent !text-white !p-0" />
            </span>
          ) : null}
        </div>
      </PageHero>

      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="rounded-card border border-border bg-surface p-6 sm:p-8">
                <h2 className="text-xl font-bold text-foreground">{dict.clinicPage.aboutTitle}</h2>
                <p className="mt-4 leading-relaxed text-muted">{clinic.description[locale]}</p>

                <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted">
                  {dict.common.specialties}
                </h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {clinic.specialtySlugs.map((slug) => {
                    const specialty = clinic.specialties.find((s) => s.slug === slug);
                    if (!specialty) return null;
                    return (
                      <li key={slug}>
                        <Link
                          href={`${cityPath(locale, city.slug)}?spec=${slug}`}
                          className="inline-flex rounded-pill border border-border bg-primary-soft px-3.5 py-1.5 text-sm font-semibold text-primary-dark transition-colors hover:bg-primary hover:text-white"
                        >
                          {specialty.name[locale]}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <h3 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted">
                  {dict.common.openingHours}
                </h3>
                <ul className="mt-3 divide-y divide-border">
                  {clinic.hours.map((row) => (
                    <li key={row.days[locale]} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                      <span className="font-semibold text-foreground">{row.days[locale]}</span>
                      <span className="tabular-nums text-muted">{row.time}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  {dict.common.lastSynced} {clinic.lastSyncedAt} — {dict.common.dataAttribution}
                </p>
              </div>
            </div>

            <aside className="space-y-4">
              <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
                {clinic.phoneHref ? (
                  <a
                    href={`tel:${clinic.phoneHref}`}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-primary text-base font-bold text-white transition-all hover:bg-primary-dark hover:shadow-lift"
                  >
                    <Phone className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    {dict.common.callNow}
                  </a>
                ) : null}
                {clinic.whatsapp ? (
                  <a
                    href={`https://wa.me/${clinic.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-pill border border-accent/40 bg-accent-soft text-base font-bold text-accent transition-all hover:bg-accent hover:text-white${clinic.phoneHref ? " mt-3" : ""}`}
                  >
                    <MessageCircle className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                    {dict.common.whatsapp}
                  </a>
                ) : null}

                <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
                  <p className="flex items-start gap-2 text-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} aria-hidden />
                    {clinic.address[locale]}
                  </p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary transition-colors hover:text-primary-dark"
                  >
                    {dict.common.openMap}
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  </a>
                  {clinic.website ? (
                    <a
                      href={clinic.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-semibold text-primary transition-colors hover:text-primary-dark"
                    >
                      {clinic.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="rounded-card gradient-soft border border-primary/20 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {clinic.claimed ? dict.clinicPage.claimedNote : dict.clinicPage.unclaimedNote}
                </p>
                {!clinic.claimed ? (
                  <>
                    <p className="mt-2 text-sm text-muted">{dict.clinicPage.youAreOwner}</p>
                    <div className="mt-4">
                      <LeadModal
                        type="clinic-claim"
                        locale={locale}
                        clinicName={clinicName}
                        trigger={
                          <button className="w-full inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent text-sm sm:text-base font-bold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-lift">
                            <CalendarCheck className="h-4.5 w-4.5" strokeWidth={2} aria-hidden />
                            <span>{dict.clinicPage.claimThisClinic}</span>
                          </button>
                        }
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </aside>
          </div>

          {others.length > 0 ? (
            <div className="mt-16">
              <h2 className="text-xl font-bold text-foreground">
                {dict.clinicPage.otherInCity} {cityName}
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {others.map((other) => (
                  <ClinicCard
                    key={other.slug}
                    clinic={other}
                    locale={locale}
                    dict={{
                      viewProfile: dict.common.viewProfile,
                      ratingSource: dict.common.ratingSource,
                      callNow: dict.common.callNow,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Container>
      </Section>
    </>
  );
}
