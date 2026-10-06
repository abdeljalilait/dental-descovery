import type { Metadata } from "next";
import { locales, type Locale } from "@/lib/i18n/config";
import { getDictionaryFor } from "@/lib/i18n/dictionaries";
import { siteConfig } from "@/lib/site.config";
import { StructuredData } from "@/components/seo/structured-data";
import { faqSchema, graph, websiteSchema } from "@/lib/seo/schema";
import { Hero } from "@/components/landing/hero";
import { StatsBar } from "@/components/landing/stats-bar";
import { CitiesSection } from "@/components/landing/cities-section";
import { FeaturedClinicsSection } from "@/components/landing/featured-clinics";
import { SpecialtiesSection } from "@/components/landing/specialties-section";
import { ClaimSection } from "@/components/landing/claim-section";
import { AppPromoSection } from "@/components/landing/app-promo";
import { WebsiteOfferSection } from "@/components/landing/website-offer";
import { PricingTeaserSection } from "@/components/landing/pricing-teaser";
import { BlogHighlightsSection } from "@/components/landing/blog-highlights";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta";
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
    title: { absolute: dict.meta.title },
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: "/fr", ar: "/ar", "x-default": "/fr" },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      url: siteConfig.url,
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang: value } = await params;
  const locale = (locales as readonly string[]).includes(value) ? (value as Locale) : "fr";
  const dict = await getDictionaryFor(locale);
  const plans = await getResolvedPricingPlans(locale, dict);

  return (
    <>
      <StructuredData
        data={graph(
          websiteSchema(locale),
          faqSchema(dict.faqSection.items.map((item) => ({ question: item.question, answer: item.answer })))
        )}
      />
      <Hero locale={locale} dict={dict} />
      <StatsBar locale={locale} dict={dict} />
      <CitiesSection locale={locale} dict={dict} />
      <FeaturedClinicsSection locale={locale} dict={dict} />
      <SpecialtiesSection locale={locale} dict={dict} />
      <ClaimSection locale={locale} dict={dict} />
      <AppPromoSection locale={locale} dict={dict} />
      <WebsiteOfferSection locale={locale} dict={dict} />
      <PricingTeaserSection locale={locale} dict={dict} plans={plans} />
      <BlogHighlightsSection locale={locale} dict={dict} />
      <FaqSection dict={dict} />
      <FinalCtaSection locale={locale} dict={dict} />
    </>
  );
}
