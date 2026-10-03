import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { ClaimLookup } from "@/components/landing/claim-lookup";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/routes";

export function ClaimSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <Section tone="soft" id="claim">
      <Container>
        <SectionHeading eyebrow={dict.claimSection.eyebrow} title={dict.claimSection.title} subtitle={dict.claimSection.subtitle} />
        <ClaimLookup
          locale={locale}
          labels={{
            lookupLabel: dict.claimSection.lookupLabel,
            lookupPlaceholder: dict.claimSection.lookupPlaceholder,
            lookupFound: dict.claimSection.lookupFound,
            lookupFoundDesc: dict.claimSection.lookupFoundDesc,
            lookupNotFound: dict.claimSection.lookupNotFound,
            lookupNotFoundDesc: dict.claimSection.lookupNotFoundDesc,
            lookupSearching: dict.claimSection.lookupSearching,
            claimCta: dict.claimSection.claimCta,
            createCta: dict.claimSection.createCta,
            viewProfile: dict.common.viewProfile,
            managedLabel: locale === "ar" ? "مُدارة" : "Gérée",
          }}
        />
        <div className="mt-10 text-center">
          <ButtonLink href={localizedPath("forClinics", locale)} variant="primary" size="lg">
            {dict.claimSection.claimCta}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
