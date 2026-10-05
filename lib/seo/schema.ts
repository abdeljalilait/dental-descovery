import { siteConfig } from "@/lib/site.config";
import type { Clinic, PricingPlanView } from "@/lib/data/types";
import { blogPostPath, clinicPath } from "@/lib/routes";
import { localeHtmlLang, type Locale } from "@/lib/i18n/config";
import { defaultOgImageUrl } from "@/lib/seo/og-image";

export function websiteSchema(locale: string) {
  return {
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: locale,
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${siteConfig.url}${item.path}`,
    })),
  };
}

export function itemListSchema(clinics: Clinic[], locale: string, citySlug: string) {
  return {
    "@type": "ItemList",
    itemListElement: clinics.map((clinic, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: clinic.name,
      url: `${siteConfig.url}${clinicPath(locale, citySlug, clinic.slug)}`,
    })),
  };
}

export function dentistSchema(clinic: Clinic, locale: string, citySlug: string, cityName: string) {
  return {
    "@type": "Dentist",
    "@id": `${siteConfig.url}${clinicPath(locale, citySlug, clinic.slug)}#dentist`,
    name: clinic.name,
    url: `${siteConfig.url}${clinicPath(locale, citySlug, clinic.slug)}`,
    ...(clinic.phone ? { telephone: clinic.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: clinic.address[locale === "ar" ? "ar" : "fr"],
      addressLocality: cityName,
      addressCountry: "MA",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: clinic.lat,
      longitude: clinic.lng,
    },
    ...(clinic.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: clinic.rating,
            reviewCount: clinic.reviewCount,
          },
        }
      : {}),
  };
}

export function articleSchema(
  post: {
    title: string;
    excerpt: string;
    date: string;
    slug: string;
    updatedAt?: string;
    imageUrl?: string | null;
  },
  locale: Locale
) {
  const url = `${siteConfig.url}${blogPostPath(locale, post.slug)}`;
  const image = post.imageUrl ?? defaultOgImageUrl(locale);

  return {
    "@type": "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: post.title,
    description: post.excerpt,
    image: [image],
    datePublished: post.date,
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    inLanguage: localeHtmlLang[locale],
    author: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
        width: 512,
        height: 512,
      },
    },
  };
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function offerCatalogSchema(plans: PricingPlanView[], locale: Locale) {
  const items = plans
    .map((plan) => {
      const cleaned = plan.price.replace(/[^\d.,]/g, "").replace(",", ".");
      const numericPrice = parseFloat(cleaned);
      if (isNaN(numericPrice)) {
        return null;
      }
      return {
        "@type": "Offer",
        name: plan.name,
        price: numericPrice,
        priceCurrency: "MAD",
        availability: "https://schema.org/InStock",
        ...(plan.features.length > 0 ? { description: plan.features.join(" • ") } : {}),
      };
    })
    .filter(Boolean);

  if (items.length === 0) return null;

  return {
    "@type": "OfferCatalog",
    name: locale === "ar" ? "عروض وأسعار Dentora" : "Tarifs et offres Dentora",
    itemListElement: items,
  };
}

export function graph(...nodes: (object | null | undefined)[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
