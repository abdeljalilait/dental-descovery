"use client";

import { Search, Building2, ArrowRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { LeadModal } from "@/components/clinic/lead-modal";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { localizedPath } from "@/lib/routes";

export function FinalCtaSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <Section className="pb-24 sm:pb-28 lg:pb-36 relative overflow-hidden">
      <Container>
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Patient Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface p-8 text-center shadow-soft sm:p-10 transition-all hover:border-primary/40 hover:shadow-lift">
            <div>
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
                <Search className="h-7 w-7" strokeWidth={1.8} aria-hidden />
              </div>
              <h2 className="display-heading mt-5 text-2xl sm:text-3xl font-extrabold text-foreground">
                {dict.finalCta.patientTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm sm:text-base leading-relaxed text-muted">
                {dict.finalCta.patientSubtitle}
              </p>
            </div>
            <div className="mt-8">
              <ButtonLink href={localizedPath("dentists", locale)} variant="outline" size="lg" className="w-full sm:w-auto">
                <span>{dict.finalCta.patientCta}</span>
                <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              </ButtonLink>
            </div>
          </div>

          {/* Clinic SaaS Card */}
          <div className="relative overflow-hidden flex flex-col justify-between rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-primary-light p-8 text-center text-white shadow-lift sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-15" aria-hidden />
            <div className="relative z-10">
              <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-md border border-white/20 shadow-sm">
                <Building2 className="h-7 w-7" strokeWidth={1.8} aria-hidden />
              </div>
              <h2 className="display-heading mt-5 text-2xl sm:text-3xl font-extrabold text-white">
                {dict.finalCta.clinicTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm sm:text-base leading-relaxed text-white/85">
                {dict.finalCta.clinicSubtitle}
              </p>
            </div>
            <div className="relative z-10 mt-8">
              <LeadModal
                type="app-demo"
                locale={locale}
                trigger={
                  <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill bg-white px-8 h-12 text-base font-extrabold text-primary-dark shadow-lift transition-all hover:bg-white/90 hover:scale-[1.02]">
                    <Building2 className="h-4.5 w-4.5 text-accent" strokeWidth={2} />
                    <span>{dict.finalCta.clinicCta}</span>
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}

