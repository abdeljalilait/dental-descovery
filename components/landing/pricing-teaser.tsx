"use client";

import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { PricingPlanView } from "@/lib/data/types";
import { localizedPath } from "@/lib/routes";
import { PricingPlans } from "./pricing-plans";

interface PricingTeaserSectionProps {
  locale: Locale;
  dict: Dictionary;
  plans: PricingPlanView[];
}

export function PricingTeaserSection({ locale, dict, plans }: PricingTeaserSectionProps) {
  return (
    <Section tone="surface" className="relative overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow={dict.pricingTeaser.eyebrow}
          title={dict.pricingTeaser.title}
          subtitle={dict.pricingTeaser.subtitle}
        />
        <PricingPlans plans={plans} locale={locale} headingLevel="h3" showCrownBadge />
        <div className="mt-12 text-center">
          <ButtonLink href={localizedPath("pricing", locale)} variant="ghost" size="lg">
            {dict.pricingTeaser.allCta}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}
