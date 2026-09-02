"use client";

import {
  CalendarCheck,
  CalendarDays,
  FolderOpen,
  MessageSquare,
  Star,
  BarChart3,
  Bot,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { InteractiveAppStudio } from "@/components/landing/interactive-app-studio";
import { ClinicRoiCalculator } from "@/components/landing/clinic-roi-calculator";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/routes";

const featureIcons = [CalendarCheck, CalendarDays, FolderOpen, MessageSquare, Star, BarChart3];

export function AppPromoSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <Section tone="surface" className="relative overflow-hidden">
      <Container>
        <SectionHeading
          eyebrow={dict.appSection.eyebrow}
          title={dict.appSection.title}
          subtitle={dict.appSection.subtitle}
          align="center"
        />

        {/* Live Interactive Studio */}
        <div className="mt-8">
          <InteractiveAppStudio locale={locale} dict={dict} />
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dict.appSection.features.map((feature, i) => {
            const Icon = featureIcons[i] ?? CalendarCheck;
            return (
              <div
                key={feature.title}
                className="flex gap-4 rounded-xl border border-border/80 bg-surface-subtle p-5 transition-all hover:border-primary/40 hover:bg-surface hover:shadow-soft"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary shadow-sm">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-foreground">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Clinic ROI Calculator */}
        <div className="mt-16">
          <ClinicRoiCalculator locale={locale} dict={dict} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href={localizedPath("app", locale)} variant="primary" size="lg">
            {dict.appSection.ctaSecondary}
          </ButtonLink>
          <LeadModal
            type="app-demo"
            locale={locale}
            trigger={
              <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-primary-soft px-6 h-12 text-base font-bold text-primary-dark hover:bg-primary hover:text-white transition-all shadow-sm">
                <Bot className="h-4.5 w-4.5 text-accent" strokeWidth={2} />
                <span>{dict.appSection.cta}</span>
              </button>
            }
          />
        </div>
      </Container>
    </Section>
  );
}

