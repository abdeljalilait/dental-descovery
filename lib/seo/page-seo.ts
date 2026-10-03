import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { getPageSeoDb } from "@/lib/repositories/blog";
import { siteConfig } from "@/lib/site.config";

interface SeoOptions {
  routeKey: string;
  locale: Locale;
  defaultTitle: string;
  defaultDescription: string;
  canonicalPath: string;
}

/**
 * Build page metadata from a `page_seos` override, falling back to the caller's
 * defaults field by field.
 *
 * An override exists only to replace what it sets: an editor who fills in just
 * the meta description keeps the generated title, and a route with no row at all
 * behaves exactly as it did before the override table existed.
 */
export async function buildDynamicMetadata(options: SeoOptions): Promise<Metadata> {
  const { routeKey, locale, defaultTitle, defaultDescription, canonicalPath } = options;

  let title = defaultTitle;
  let description = defaultDescription;
  let ogImageUrl: string | undefined;
  let robots: string | undefined;

  const override = await getPageSeoDb(routeKey, locale);
  if (override) {
    if (override.metaTitle) title = override.metaTitle;
    if (override.metaDescription) description = override.metaDescription;
    if (override.ogImageUrl) ogImageUrl = override.ogImageUrl;
    if (override.metaRobots) robots = override.metaRobots;
  }

  const url = `${siteConfig.url}${canonicalPath}`;
  const hreflangPath = canonicalPath.replace(/^\/(fr|ar)/, "");

  return {
    title: { absolute: title },
    description,
    ...(override?.keywords ? { keywords: override.keywords } : {}),
    ...(robots ? { robots } : {}),
    alternates: {
      // An explicit canonical override wins over the route's own path.
      canonical: override?.canonicalUrl || url,
      languages: {
        fr: `${siteConfig.url}/fr${hreflangPath}`,
        ar: `${siteConfig.url}/ar${hreflangPath}`,
        "x-default": `${siteConfig.url}/fr${hreflangPath}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      url,
      title,
      description,
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }] } : {}),
    },
  };
}