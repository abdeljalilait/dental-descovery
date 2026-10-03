import type { Metadata } from "next";
import { Check } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { LeadForm } from "@/components/clinic/lead-form";
import { AppPromoSection } from "@/components/landing/app-promo";
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
    title: { absolute: `${dict.forClinicsPage.eyebrow} — ${dict.forClinicsPage.title}` },
    description: dict.forClinicsPage.subtitle,
    alternates: {
      canonical: localizedPath("forClinics", locale),
      languages: { fr: localizedPath("forClinics", "fr"), ar: localizedPath("forClinics", "ar"), "x-default": localizedPath("forClinics", locale) },
    },
  };
}

export default async function ForClinicsPage({
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
        eyebrow={dict.forClinicsPage.eyebrow}
        title={dict.forClinicsPage.title}
        subtitle={dict.forClinicsPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.nav.forClinics }]}
      />

      <Section>
        <Container>
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
            {dict.forClinicsPage.steps.map((step, i) => (
              <div key={step.title} className="rounded-2xl border border-border/80 bg-surface p-6 shadow-soft transition-all hover:border-primary/40 hover:shadow-lift">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary text-base font-extrabold shadow-sm">
                  {i + 1}
                </span>
                <h2 className="mt-4 text-base font-extrabold text-foreground">{step.title}</h2>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/40 via-surface to-surface p-8 shadow-soft">
              <h2 className="text-xl font-extrabold text-foreground">{dict.forClinicsPage.benefitsTitle}</h2>
              <ul className="mt-6 space-y-3.5">
                {dict.forClinicsPage.benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface p-8 shadow-lift" id="claim-form">
              <h2 className="text-xl font-extrabold text-foreground">{dict.forClinicsPage.formTitle}</h2>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">{dict.forClinicsPage.formSubtitle}</p>
              <LeadForm
                type="clinic-claim"
                labels={dict.appPage}
                submitLabel={dict.forClinicsPage.cta}
                showMessage={false}
                className="mt-6"
              />
            </div>
          </div>
        </Container>
      </Section>

      <AppPromoSection locale={locale} dict={dict} />
    </>
  );
}
