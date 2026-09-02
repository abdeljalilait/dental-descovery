import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ClinicCard } from "@/components/directory/clinic-card";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getFeaturedClinics } from "@/lib/data/clinics";

export function FeaturedClinicsSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const clinics = getFeaturedClinics(6);

  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow={dict.featuredClinics.eyebrow}
          title={dict.featuredClinics.title}
          subtitle={dict.featuredClinics.subtitle}
        />
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
      </Container>
    </Section>
  );
}
