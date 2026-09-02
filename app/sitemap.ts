import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site.config";
import { locales } from "@/lib/i18n/config";
import { cityPath, clinicPath, treatmentPath, blogPostPath, localizedPath } from "@/lib/routes";
import { cities } from "@/lib/data/cities";
import { clinics } from "@/lib/data/clinics";
import { specialties } from "@/lib/data/specialties";
import { blogPosts } from "@/lib/data/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const entries: MetadataRoute.Sitemap = [];

  const staticRouteKeys = ["home", "dentists", "treatments", "blog", "app", "forClinics", "website", "pricing", "contact"] as const;

  for (const routeKey of staticRouteKeys) {
    for (const locale of locales) {
      const path = routeKey === "home" ? `/${locale}` : localizedPath(routeKey, locale);
      entries.push({
        url: `${base}${path}`,
        changeFrequency: routeKey === "home" ? "weekly" : "monthly",
        priority: routeKey === "home" ? 1 : routeKey === "dentists" ? 0.9 : 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => {
              const p = routeKey === "home" ? `/${l}` : localizedPath(routeKey, l);
              return [l, `${base}${p}`];
            })
          ),
        },
      });
    }
  }

  for (const city of cities) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${cityPath(locale, city.slug)}`,
        changeFrequency: "weekly",
        priority: 0.9,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${base}${cityPath(l, city.slug)}`])),
        },
      });
    }
  }

  for (const clinic of clinics) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${clinicPath(locale, clinic.citySlug, clinic.slug)}`,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${base}${clinicPath(l, clinic.citySlug, clinic.slug)}`])
          ),
        },
      });
    }
  }

  for (const specialty of specialties) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${treatmentPath(locale, specialty.slug)}`,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${base}${treatmentPath(l, specialty.slug)}`])),
        },
      });
    }
  }

  for (const post of blogPosts) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${blogPostPath(locale, post.slug)}`,
        lastModified: new Date(post.date),
        changeFrequency: "yearly",
        priority: 0.6,
        alternates: {
          languages: Object.fromEntries(locales.map((l) => [l, `${base}${blogPostPath(l, post.slug)}`])),
        },
      });
    }
  }

  return entries;
}
