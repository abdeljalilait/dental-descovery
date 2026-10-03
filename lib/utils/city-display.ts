import type { Locale } from "@/lib/i18n/config";
import type { City } from "@/lib/data/types";

/**
 * Localized city display name. Lives outside `lib/data/cities.ts` because that
 * module is seed-only: this is a formatter over an already-loaded `City`, not a
 * source of data.
 */
export function cityDisplayName(city: City, locale: Locale): string {
  return locale === "ar" ? city.nameAr : city.name;
}
