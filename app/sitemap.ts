import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site.config";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { cityPath, clinicPath, treatmentPath, blogPostPath, localizedPath } from "@/lib/routes";
import { getCitySlugsDb } from "@/lib/repositories/cities";
import { getClinicSlugsDb } from "@/lib/repositories/clinics";
import { getSpecialtySlugsDb } from "@/lib/repositories/specialties";
import { getBlogArticlesDb } from "@/lib/repositories/blog";

/**
 * Cities, specialties, clinics and blog URLs all come from the database.
 *
 * Every clinic is listed, so this emits roughly `2 x clinicCount` profile URLs.
 * If that produces too much thin-content signal, the lever is to require a
 * website or phone on the row rather than to truncate the list.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const entries: MetadataRoute.Sitemap = [];

  const [citySlugs, clinicSlugs, specialtySlugs, posts] = await Promise.all([
    getCitySlugsDb(),
    getClinicSlugsDb(),
    getSpecialtySlugsDb(),
    getBlogArticlesDb(),
  ]);

  /**
   * hreflang for both locales plus `x-default`, which points at the locale the
   * root URL redirects to. Google reads hreflang from a sitemap, which is how a
   * layout that cannot see its own leaf segment gets alternates onto every page.
   */
  const alternates = (pathFor: (locale: Locale) => string) => ({
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `${base}${pathFor(l)}`])),
      "x-default": `${base}${pathFor(defaultLocale)}`,
    },
  });

  const staticRouteKeys = ["home", "dentists", "treatments", "blog", "app", "forClinics", "website", "pricing", "contact"] as const;

  for (const routeKey of staticRouteKeys) {
    for (const locale of locales) {
      const pathFor = (l: Locale) => (routeKey === "home" ? `/${l}` : localizedPath(routeKey, l));
      entries.push({
        url: `${base}${pathFor(locale)}`,
        changeFrequency: routeKey === "home" ? "weekly" : "monthly",
        priority: routeKey === "home" ? 1 : routeKey === "dentists" ? 0.9 : 0.7,
        alternates: alternates(pathFor),
      });
    }
  }

  for (const citySlug of citySlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${cityPath(locale, citySlug)}`,
        changeFrequency: "weekly",
        priority: 0.9,
        alternates: alternates((l) => cityPath(l, citySlug)),
      });
    }
  }

  for (const { citySlug, slug, updatedAt } of clinicSlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${clinicPath(locale, citySlug, slug)}`,
        lastModified: updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
        alternates: alternates((l) => clinicPath(l, citySlug, slug)),
      });
    }
  }

  for (const slug of specialtySlugs) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${treatmentPath(locale, slug)}`,
        changeFrequency: "monthly",
        priority: 0.8,
        alternates: alternates((l) => treatmentPath(l, slug)),
      });
    }
  }

  for (const post of posts) {
    for (const locale of locales) {
      entries.push({
        url: `${base}${blogPostPath(locale, post.slug)}`,
        lastModified: new Date(post.updatedAt || post.date),
        changeFrequency: "monthly",
        priority: 0.6,
        alternates: alternates((l) => blogPostPath(l, post.slug)),
      });
    }
  }

  return entries;
}