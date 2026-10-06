import type { Metadata } from "next";
import { Check } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { PageHero } from "@/components/layout/page-hero";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { FaqSection } from "@/components/landing/faq-section";
import { StructuredData } from "@/components/seo/structured-data";
import { faqSchema, graph, offerCatalogSchema, websiteSchema } from "@/lib/seo/schema";
import { localizedPath } from "@/lib/routes";
import { ClinicRoiCalculator } from "@/components/landing/clinic-roi-calculator";
import { PricingPlans } from "@/components/landing/pricing-plans";
import { getResolvedPricingPlans } from "@/lib/pricing/plans";

export const dynamic = "force-dynamic";

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
      languages: {
        fr: localizedPath("pricing", "fr"),
        ar: localizedPath("pricing", "ar"),
        "x-default": localizedPath("pricing", locale),
      },
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const plans = await getResolvedPricingPlans(locale, dict);

  const includedFeatures = [
    {
      title: locale === "ar" ? "تطبيق سحابي متكامل" : "Application dentaire Cloud",
      desc:
        locale === "ar"
          ? "إمكانية الوصول من أي جهاز بدون تثبيت معقد"
          : "Accessible partout sans installation matérielle lourde",
    },
    {
      title: locale === "ar" ? "استضافة واسم نطاق" : "Hébergement serveur & domaine",
      desc:
        locale === "ar"
          ? "سيرفرات آمنة مع اسم نطاق رسمي"
          : "Serveurs hautement disponibles et nom de domaine dédié",
    },
    {
      title: locale === "ar" ? "نسخ احتياطي دوري" : "Sauvegardes automatisées",
      desc:
        locale === "ar"
          ? "حماية كاملة لملفات المرضى والتاريخ الطبي"
          : "Sauvegardes chiffrées régulières de vos données de santé",
    },
    {
      title: locale === "ar" ? "تحديثات مستمرة" : "Mises à jour incluses",
      desc:
        locale === "ar"
          ? "ميزات وتحسينات جديدة بشكل تلقائي"
          : "Nouvelles fonctionnalités et conformité réglementaire",
    },
    {
      title: locale === "ar" ? "دعم فني وتدريب" : "Support technique réactif",
      desc:
        locale === "ar"
          ? "مساعدة فريق الخبراء لتأهيل طاقم العيادة"
          : "Assistance et accompagnement de votre équipe au quotidien",
    },
    {
      title: locale === "ar" ? "إشعارات WhatsApp" : "Rappels WhatsApp automatiques",
      desc:
        locale === "ar"
          ? "تأكيد المواعيد وتقليل نسبة الغياب"
          : "Envoi automatisé des rappels pour réduire l'absentéisme",
    },
  ];

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          faqSchema(dict.faqSection.items.map((item) => ({ question: item.question, answer: item.answer }))),
          offerCatalogSchema(plans, locale)
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
          {/* Setup Fee Banner */}
          <div className="mb-12 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary-soft/50 via-surface to-primary-soft/50 p-6 sm:p-8 text-center shadow-soft">
            <span className="inline-flex rounded-pill bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {locale === "ar" ? "الهيكل التجاري" : "Structure commerciale"}
            </span>
            <p className="mt-3 text-2xl sm:text-3xl font-black text-foreground">
              {locale === "ar"
                ? "رسوم التثبيت: 4 000 درهم / عيادة"
                : "Frais d'installation : 4 000 MAD / cabinet"}
            </p>
            <p className="mt-2 text-sm sm:text-base font-medium text-muted">
              {locale === "ar"
                ? "ثم اشتراك شهري يتضمن: Cloud + البرنامج + الدعم الفني + المستخدمين + WhatsApp"
                : "Puis un abonnement composé de : Cloud + logiciel + support + utilisateurs + WhatsApp"}
            </p>
          </div>

          <PricingPlans plans={plans} locale={locale} headingLevel="h2" showCrownBadge />

          {/* Included in Every Plan */}
          <div className="mt-16 rounded-2xl border border-border/80 bg-surface p-8 shadow-soft">
            <div className="max-w-2xl">
              <h3 className="text-xl font-extrabold text-foreground">
                {locale === "ar" ? "ما هو مدمج في كل اشتراك" : "Ce qui est inclus dans chaque abonnement"}
              </h3>
              <p className="mt-1 text-sm text-muted">
                {locale === "ar"
                  ? "جميع الباقات تستفيد من بنية تحتية سحابية متكاملة ودعم تقني مستمر."
                  : "Chaque formule comprend l'ensemble des services indispensables au bon fonctionnement de votre cabinet :"}
              </p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {includedFeatures.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-subtle/50 p-4 transition-colors hover:border-primary/30"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent mt-0.5">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="mt-0.5 text-xs text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
