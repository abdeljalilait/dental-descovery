import { siteConfig } from "@/lib/site.config";
import type { Clinic } from "@/lib/data/types";
import { clinicPath } from "@/lib/routes";

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
    telephone: clinic.phone,
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

export function articleSchema(post: { title: string; excerpt: string; date: string; slug: string }, locale: string) {
  return {
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    inLanguage: locale,
    author: { "@type": "Organization", name: siteConfig.name },
    publisher: { "@type": "Organization", name: siteConfig.name },
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

export function graph(...nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.filter(Boolean),
  };
}
