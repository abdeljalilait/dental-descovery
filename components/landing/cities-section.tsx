import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { CityCard } from "@/components/directory/city-card";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getCitiesDb } from "@/lib/repositories/cities";
import { getClinicCountByCityDb } from "@/lib/repositories/stats";
import { localizedPath } from "@/lib/routes";

export async function CitiesSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [cities, countsByCity] = await Promise.all([getCitiesDb(), getClinicCountByCityDb()]);

  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow={dict.citiesSection.eyebrow}
          title={dict.citiesSection.title}
          subtitle={dict.citiesSection.subtitle}
        />
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
        <div className="mt-10 text-center">
          <ButtonLink href={localizedPath("dentists", locale)} variant="outline" size="lg">
            {dict.citiesSection.allCitiesCta}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}