import type { Metadata } from "next";
import { Check, ExternalLink, Globe } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/lib/site.config";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { LeadForm } from "@/components/clinic/lead-form";
import { localizedPath } from "@/lib/routes";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionaryFor("fr");
  return {
    title: { absolute: `${dict.websiteSection.eyebrow} — ${dict.websiteSection.title}` },
    description: dict.websiteSection.subtitle,
    alternates: {
      canonical: localizedPath("website", "fr"),
      languages: { fr: localizedPath("website", "fr"), ar: localizedPath("website", "ar") },
    },
  };
}

export default async function WebsitePage({
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
        eyebrow={dict.websiteSection.eyebrow}
        title={dict.websiteSection.title}
        subtitle={dict.websiteSection.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.websiteSection.eyebrow }]}
      />

      <Section>
        <Container>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-border/80 bg-surface p-8 shadow-soft">
              <h2 className="text-xl font-extrabold text-foreground">{dict.websitePage.beforeTitle}</h2>
              <ul className="mt-6 space-y-3.5">
                {dict.websitePage.before.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-xs sm:text-sm text-muted">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive/60" aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/40 via-surface to-surface p-8 shadow-lift">
              <h2 className="text-xl font-extrabold text-primary">{dict.websitePage.afterTitle}</h2>
              <ul className="mt-6 space-y-3.5">
                {dict.websitePage.after.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-xs sm:text-sm text-foreground">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="relative overflow-hidden mx-auto mt-12 max-w-4xl rounded-2xl bg-gradient-to-br from-primary-dark via-primary to-primary-light p-8 text-white shadow-lift sm:p-10">
            <div className="pointer-events-none absolute inset-0 bg-grid-subtle opacity-15" aria-hidden />
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <span className="rounded-pill bg-white/20 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  {dict.websiteSection.demoLabel}
                </span>
                <h2 className="mt-3 text-2xl font-black text-white">{dict.websitePage.demoTitle}</h2>
                <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-white/85">{dict.websitePage.demoDesc}</p>
              </div>
              <a
                href={siteConfig.websiteDemoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-pill bg-white px-6 text-sm font-extrabold text-primary-dark shadow-lift transition-all hover:bg-white/90 hover:scale-[1.02]"
              >
                <Globe className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
                <span>{dict.websiteSection.demoCta}</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </a>
            </div>
          </div>
        </Container>
      </Section>

      <Section tone="surface">
        <Container>
          <div className="mx-auto max-w-2xl rounded-2xl border border-border/80 bg-surface p-6 shadow-lift sm:p-10">
            <h2 className="text-2xl font-extrabold text-foreground">{dict.websitePage.formTitle}</h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">{dict.websitePage.formSubtitle}</p>
            <LeadForm
              type="website-quote"
              labels={dict.appPage}
              submitLabel={dict.websitePage.cta}
              className="mt-6"
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
