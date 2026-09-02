"use client";

import Link from "next/link";
import { Check, ExternalLink, Globe, Smartphone } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/lib/site.config";
import { localizedPath } from "@/lib/routes";

export function WebsiteOfferSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <Section className="relative overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow={dict.websiteSection.eyebrow}
          title={dict.websiteSection.title}
          subtitle={dict.websiteSection.subtitle}
        />

        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/80 bg-surface p-8 shadow-soft transition-all hover:border-primary/40 hover:shadow-lift">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <Globe className="h-6 w-6" strokeWidth={1.8} aria-hidden />
            </div>
            <h3 className="mt-4 text-xl font-extrabold text-foreground">{dict.websitePage.demoTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{dict.websitePage.demoDesc}</p>
            <Link
              href={siteConfig.websiteDemoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-pill bg-primary-soft px-4 py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-white"
            >
              <Smartphone className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              <span>{dict.websiteSection.demoCta}</span>
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Link>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/30 via-surface to-surface p-8 shadow-lift">
            <h3 className="text-xl font-extrabold text-foreground">{dict.websiteSection.subtitle}</h3>
            <ul className="mt-6 space-y-3.5">
              {dict.websiteSection.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-foreground">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href={localizedPath("website", locale)} variant="outline" size="lg">
            {dict.websiteSection.cta}
          </ButtonLink>
          <LeadModal
            type="website-quote"
            locale={locale}
            trigger={
              <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary px-6 h-12 text-base font-bold text-white shadow-sm transition-all hover:bg-primary-dark hover:shadow-lift">
                <Globe className="h-4.5 w-4.5 text-accent" strokeWidth={1.8} />
                <span>{locale === "ar" ? "طلب موقع مخصص لعيادتي" : "Demander un devis site web"}</span>
              </button>
            }
          />
        </div>
      </Container>
    </Section>
  );
}

