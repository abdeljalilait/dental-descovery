import { cache } from "react";
import prisma from "@/lib/prisma";
import type { City } from "@/lib/data/types";

/**
 * Map a contract City row to the application City model, collapsing the
 * `*Fr`/`*Ar` column pairs into the localized records the UI expects.
 */
function mapCityRow(row: {
  slug: string;
  name: string;
  nameAr: string;
  regionFr: string;
  regionAr: string;
  lat: number;
  lng: number;
  populationFr: string;
  populationAr: string;
  seoIntroFr: string;
  seoIntroAr: string;
  featured: boolean;
}): City {
  return {
    slug: row.slug,
    name: row.name,
    nameAr: row.nameAr,
    region: { fr: row.regionFr, ar: row.regionAr },
    lat: row.lat,
    lng: row.lng,
    populationNote: { fr: row.populationFr, ar: row.populationAr },
    seoIntro: { fr: row.seoIntroFr, ar: row.seoIntroAr },
    featured: row.featured,
  };
}

/** Every city, featured first then alphabetical, for directory listings. */
export async function getCitiesDb(): Promise<City[]> {
  const rows = await prisma.orm.public.City.all();
  return rows
    .map(mapCityRow)
    .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "fr"));
}

/** A single city, or `undefined` when the slug is unknown (drives `notFound()`). */
export async function getCityDb(slug: string): Promise<City | undefined> {
  const row = await prisma.orm.public.City.where({ slug }).first();
  return row ? mapCityRow(row) : undefined;
}

/** City slugs only — the cheap query for `generateStaticParams` and the sitemap. */
export async function getCitySlugsDb(): Promise<string[]> {
  const rows = await prisma.orm.public.City.all();
  return rows.map((row) => row.slug);
}

/**
 * Per-request memoized city lookup for components that only need the display
 * name. A city grid renders every clinic in one city, so memoizing by slug
 * collapses that from one query per card to one query per city per request.
 */
export const getCityForRender = cache(async (slug: string) => getCityDb(slug));