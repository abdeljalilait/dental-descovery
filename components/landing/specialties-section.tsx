import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { Container } from "@/components/ui/container";
import { SpecialtyIcon } from "@/components/ui/specialty-icon";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getSpecialtiesDb, getClinicCountBySpecialtyDb } from "@/lib/repositories/specialties";
import { treatmentPath } from "@/lib/routes";

export async function SpecialtiesSection({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [specialties, countsBySpecialty] = await Promise.all([
    getSpecialtiesDb(),
    getClinicCountBySpecialtyDb(),
  ]);
  return (
    <Section tone="surface">
      <Container>
        <SectionHeading
          eyebrow={dict.specialtiesSection.eyebrow}
          title={dict.specialtiesSection.title}
          subtitle={dict.specialtiesSection.subtitle}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {specialties.map((specialty) => {
            const count = countsBySpecialty[specialty.slug] ?? 0;
            return (
              <Link
                key={specialty.slug}
                href={treatmentPath(locale, specialty.slug)}
                className="group flex h-full flex-col rounded-2xl border border-border/80 bg-surface p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-lift"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary transition-all group-hover:bg-primary group-hover:text-white group-hover:shadow-sm">
                  <SpecialtyIcon name={specialty.icon} className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-base sm:text-lg font-black text-foreground transition-colors group-hover:text-primary">
                  {specialty.name[locale]}
                </h3>
                <p className="mt-2 flex-1 text-xs sm:text-sm leading-relaxed text-muted">{specialty.description[locale]}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary-dark">
                  <span>{count} {dict.specialtiesSection.clinicsCount}</span>
                  <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" strokeWidth={2.2} aria-hidden />
                </span>
              </Link>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
