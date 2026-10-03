import type { Metadata } from "next";
import { CalendarCheck, CalendarDays, FolderOpen, MessageSquare, Star, BarChart3, Check } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { LeadForm } from "@/components/clinic/lead-form";
import { FaqSection } from "@/components/landing/faq-section";
import { localizedPath } from "@/lib/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  return {
    title: { absolute: `Dental App — ${dict.appSection.title}` },
    description: dict.appSection.subtitle,
    alternates: {
      canonical: localizedPath("app", locale),
      languages: { fr: localizedPath("app", "fr"), ar: localizedPath("app", "ar"), "x-default": localizedPath("app", locale) },
    },
  };
}

import { InteractiveAppStudio } from "@/components/landing/interactive-app-studio";
import { ClinicRoiCalculator } from "@/components/landing/clinic-roi-calculator";

const featureIcons = [CalendarCheck, CalendarDays, FolderOpen, MessageSquare, Star, BarChart3];

export default async function DentalAppPage({
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
        eyebrow={dict.appPage.eyebrow}
        title={dict.appPage.title}
        subtitle={dict.appPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.nav.app }]}
      />

      {/* Interactive SaaS Studio */}
      <Section className="pb-0">
        <Container>
          <InteractiveAppStudio locale={locale} dict={dict} />
        </Container>
      </Section>

      <Section>
        <Container>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dict.appSection.features.map((feature, i) => {
              const Icon = featureIcons[i] ?? CalendarCheck;
              return (
                <div key={feature.title} className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-lift">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-sm">
                    <Icon className="h-5.5 w-5.5" strokeWidth={1.8} aria-hidden />
                  </span>
                  <h2 className="mt-4 text-base font-extrabold text-foreground">{feature.title}</h2>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-16">
            <ClinicRoiCalculator locale={locale} dict={dict} />
          </div>
        </Container>
      </Section>

      <Section tone="surface">
        <Container>
          <SectionHeading title={dict.appPage.workflowTitle} />
          <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dict.appPage.workflow.map((step, i) => (
              <li key={step.step} className="relative rounded-card border border-border bg-surface p-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-pill bg-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-base font-bold text-foreground">{step.step}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section id="demo">
        <Container>
          <div className="mx-auto max-w-2xl rounded-card border border-border bg-surface p-6 shadow-card sm:p-10">
            <SectionHeading title={dict.appPage.demoTitle} subtitle={dict.appPage.demoSubtitle} />
            <p className="mb-6 -mt-4 text-center text-sm text-muted">{dict.appPage.pricingNote}</p>
            <LeadForm type="app-demo" labels={dict.appPage} submitLabel={dict.appPage.cta} showMessage={false} />
          </div>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted">
            {dict.pricingTeaser.pro.features.slice(0, 3).map((feature) => (
              <li key={feature} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" strokeWidth={2.5} aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      <FaqSection dict={dict} />
    </>
  );
}
