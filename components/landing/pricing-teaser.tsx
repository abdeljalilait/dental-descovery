"use client";

import { Check, Crown } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/routes";
import { cn } from "@/lib/utils/cn";

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

export function PricingTeaserSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
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
    <Section tone="surface" className="relative overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow={dict.pricingTeaser.eyebrow}
          title={dict.pricingTeaser.title}
          subtitle={dict.pricingTeaser.subtitle}
        />
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
                    <Crown className="h-3.5 w-3.5 text-accent" strokeWidth={2.2} />
                    <span>{plan.badge}</span>
                  </span>
                </div>
              ) : null}
              <h3 className="text-xl font-extrabold text-foreground">{plan.name}</h3>
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
        <div className="mt-12 text-center">
          <ButtonLink href={localizedPath("pricing", locale)} variant="ghost" size="lg">
            {dict.pricingTeaser.allCta}
          </ButtonLink>
        </div>
      </Container>
    </Section>
  );
}

