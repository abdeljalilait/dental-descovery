import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SpecialtiesSection } from "@/components/landing/specialties-section";
import { FinalCtaSection } from "@/components/landing/final-cta";
import { localizedPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  return {
    title: dict.treatmentsPage.title,
    description: dict.treatmentsPage.subtitle,
    alternates: {
      canonical: localizedPath("treatments", locale),
      languages: {
        fr: localizedPath("treatments", "fr"),
        ar: localizedPath("treatments", "ar"),
        "x-default": localizedPath("treatments", locale)
        },
    },
  };
}

export default async function TreatmentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);

  return (
    <>
      <PageHero
        eyebrow={dict.specialtiesSection.eyebrow}
        title={dict.treatmentsPage.title}
        subtitle={dict.treatmentsPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.nav.treatments }]}
      />
      <SpecialtiesSection locale={locale} dict={dict} />
      <Section tone="surface">
        <Container className="text-center text-sm text-muted">
          {dict.common.dataAttribution}
        </Container>
      </Section>
      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
