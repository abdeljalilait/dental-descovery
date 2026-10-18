import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { CityCard } from "@/components/directory/city-card";
import { FinalCtaSection } from "@/components/landing/final-cta";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getClinicCountByCityDb } from "@/lib/repositories/stats";
import { localizedPath } from "@/lib/routes";
import { buildDynamicMetadata } from "@/lib/seo/page-seo";
import { StructuredData } from "@/components/seo/structured-data";
import { breadcrumbSchema, graph, websiteSchema } from "@/lib/seo/schema";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  return buildDynamicMetadata({ routeKey: "dentists", locale, defaultTitle: dict.dentistsPage.title, defaultDescription: dict.dentistsPage.subtitle, canonicalPath: localizedPath("dentists", locale) });
}

export default async function DentistsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const [cities, countsByCity] = await Promise.all([getCitiesDb(), getClinicCountByCityDb()]);

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          breadcrumbSchema([
            { name: dict.nav.home, path: `/${locale}` },
            { name: dict.nav.dentists, path: localizedPath("dentists", locale) },
          ])
        )}
      />
      <PageHero
        eyebrow={dict.citiesSection.eyebrow}
        title={dict.dentistsPage.title}
        subtitle={dict.dentistsPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.nav.dentists }]}
      />
      <Section>
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city) => (
              <CityCard
                key={city.slug}
                city={city}
                locale={locale}
                exploreLabel={dict.citiesSection.exploreCity}
                clinicsLabel={dict.common.clinics}
                clinicCount={countsByCity[city.slug] ?? 0}
              />
            ))}
          </div>
        </Container>
      </Section>
      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
