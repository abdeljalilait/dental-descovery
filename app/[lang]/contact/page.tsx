import type { Metadata } from "next";
import { Mail } from "lucide-react";
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
    title: dict.contactPage.title,
    description: dict.contactPage.subtitle,
    alternates: {
      canonical: localizedPath("contact", "fr"),
      languages: { fr: localizedPath("contact", "fr"), ar: localizedPath("contact", "ar") },
    },
  };
}

export default async function ContactPage({
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
        eyebrow={dict.contactPage.eyebrow}
        title={dict.contactPage.title}
        subtitle={dict.contactPage.subtitle}
        crumbs={[{ label: dict.nav.home, href: `/${locale}` }, { label: dict.footer.contactUs }]}
      />
      <Section>
        <Container>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-lift sm:p-8">
              <h2 className="text-2xl font-extrabold text-foreground">{dict.contactPage.formTitle}</h2>
              <LeadForm
                type="contact"
                labels={dict.appPage}
                showClinicName={false}
                showCity={false}
                className="mt-6"
              />
            </div>
            <aside className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary-soft/40 via-surface to-surface p-6 sm:p-8 shadow-soft">
              <h2 className="text-lg font-extrabold text-foreground">{siteConfig.name}</h2>
              <a
                href={`mailto:${siteConfig.email}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-dark"
              >
                <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
                <span>{siteConfig.email}</span>
              </a>
              <p className="mt-6 text-xs sm:text-sm leading-relaxed text-muted">{dict.contactPage.subtitle}</p>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}
