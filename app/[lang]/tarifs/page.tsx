import type { Metadata } from "next";
import { Check } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { FaqSection } from "@/components/landing/faq-section";
import { StructuredData } from "@/components/seo/structured-data";
import { faqSchema, graph, websiteSchema } from "@/lib/seo/schema";
import { localizedPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";

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
    title: { absolute: `${dict.pricingPage.title}` },
    description: dict.pricingPage.subtitle,
    alternates: {
      canonical: localizedPath("pricing", locale),
      languages: { fr: localizedPath("pricing", "fr"), ar: localizedPath("pricing", "ar"), "x-default": localizedPath("pricing", locale) },
    },
  };
}

import { LeadModal } from "@/components/clinic/lead-modal";
import { ClinicRoiCalculator } from "@/components/landing/clinic-roi-calculator";

type Plan = {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  leadType: "clinic-claim" | "app-demo" | "website-quote";
  badge?: string;
};

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);

  const plans: Plan[] = [
    {
      name: dict.pricingTeaser.free.name,
      price: dict.pricingTeaser.free.price,
      period: dict.pricingTeaser.free.period,
      features: dict.pricingTeaser.free.features,
      cta: dict.pricingTeaser.free.cta,
      href: localizedPath("forClinics", locale),
      leadType: "clinic-claim",
    },
    {
      name: dict.pricingTeaser.pro.name,
      price: dict.pricingTeaser.pro.price,
      period: dict.pricingTeaser.pro.period,
      features: dict.pricingTeaser.pro.features,
      cta: dict.pricingTeaser.pro.cta,
      href: localizedPath("app", locale),
      leadType: "app-demo",
      badge: dict.pricingTeaser.pro.badge,
    },
    {
      name: dict.pricingTeaser.website.name,
      price: dict.pricingTeaser.website.price,
      period: dict.pricingTeaser.website.period,
      features: dict.pricingTeaser.website.features,
      cta: dict.pricingTeaser.website.cta,
      href: localizedPath("website", locale),
      leadType: "website-quote",
    },
  ];

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          faqSchema(dict.faqSection.items.map((item) => ({ question: item.question, answer: item.answer })))
        )}
      />
      <PageHero
        eyebrow={dict.pricingPage.eyebrow}
        title={dict.pricingPage.title}
        subtitle={dict.pricingPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.pricingTeaser.eyebrow }]}
      />

      <Section>
        <Container>
          <div className="grid gap-8 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <article
                key={plan.name}
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border p-8 transition-all duration-300",
                  i === 1
                    ? "border-primary/50 bg-gradient-to-b from-primary-soft/40 via-surface to-surface shadow-lift scale-105"
                    : "border-border/80 bg-surface shadow-soft hover:border-primary/30 hover:shadow-card"
                )}
              >
                {plan.badge ? (
                  <div className="absolute -top-3.5 start-1/2 -translate-x-1/2 rtl:translate-x-1/2">
                    <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-1 text-xs font-extrabold text-white shadow-md">
                      <span>{plan.badge}</span>
                    </span>
                  </div>
                ) : null}
                <h2 className="text-xl font-extrabold text-foreground">{plan.name}</h2>
                <p className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-primary">{plan.price}</span>
                  <span className="text-xs font-medium text-muted">{plan.period}</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3.5 border-t border-border/60 pt-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <LeadModal
                    type={plan.leadType}
                    locale={locale}
                    trigger={
                      <button
                        className={cn(
                          "w-full cursor-pointer h-12 rounded-pill font-bold text-sm shadow-sm transition-all hover:scale-[1.02]",
                          i === 1
                            ? "bg-primary text-white hover:bg-primary-dark hover:shadow-lift"
                            : "bg-primary-soft text-primary-dark hover:bg-primary hover:text-white"
                        )}
                      >
                        {plan.cta}
                      </button>
                    }
                  />
                </div>
              </article>
            ))}
          </div>

          {/* Calculator in Tarifs */}
          <div className="mt-20">
            <ClinicRoiCalculator locale={locale} dict={dict} />
          </div>
        </Container>
      </Section>

      <FaqSection dict={dict} />
    </>
  );
}
