import { cities, getCity } from "@/lib/data/cities";
import type { City, Clinic } from "@/lib/data/types";
import prisma from "@/lib/prisma";
import { toInstant, toJson } from "@/src/prisma/codecs";
import {
  DENTAL_KEYWORD_GROUPS,
  DENTAL_KEYWORD_LABELS,
  DEFAULT_ZOOM,
  MAX_CITY_RADIUS_KM,
  MONTHLY_SEARCH_BUDGET,
  PRIMARY_DENTAL_KEYWORDS,
  SearchBudget,
  SearchBudgetExceededError,
  buildCityQueries,
  getSerpApiAccountInfo,
  inferSpecialties,
  isSameClinicAs,
  mapSerpApiPlaceToClinic,
  normalizeMoroccanPhone,
  parseOperatingHours,
  parseRating,
  parseReviewCount,
  resolveNameAr,
  sanitizeKeywords,
  searchPlaces,
  slugify,
  syncCityWithKeywords as syncCityCore,
  syncAllCities as syncAllCitiesCore,
} from "@/lib/services/serpapi-core.mjs";

/**
 * SerpApi Google Maps place model.
 * @see lib/services/serpapi-core.mjs for the fetch/parse implementation.
 */
export interface SerpApiPlace {
  position?: number;
  title: string;
  place_id: string;
  data_id?: string;
  data_cid?: string;
  provider_id?: string;
  reviews_link?: string;
  photos_link?: string;
  gps_coordinates?: {
    latitude: number;
    longitude: number;
  };
  rating?: number | string;
  reviews?: number | string;
  user_reviews?: number;
  reviews_original?: number;
  rating_summary?: Array<{ stars: number; amount: number }>;
  type?: string;
  types?: string[];
  type_id?: string;
  type_ids?: string[];
  address?: string;
  country?: string;
  open_state?: string;
  hours?: string;
  operating_hours?: Record<string, string>;
  phone?: string;
  website?: string;
  thumbnail?: string;
  serpapi_thumbnail?: string;
  description?: string;
  /** Present when the listing has not been claimed by its owner. */
  unclaimed_listing?: boolean;
}

export interface SerpApiPagination {
  next?: string;
}

export interface SerpApiResponse {
  search_metadata?: {
    id: string;
    status: string;
    total_time_taken: number;
  };
  search_parameters?: {
    engine: string;
    q: string;
    ll?: string;
    hl?: string;
    gl?: string;
  };
  search_information?: {
    local_results_state?: string;
    query_displayed?: string;
  };
  local_results?: SerpApiPlace[];
  place_results?: SerpApiPlace;
  serpapi_pagination?: SerpApiPagination;
  error?: string;
}

export interface SyncCityResult {
  citySlug: string;
  cityName: string;
  fetched: number;
  clinics: Clinic[];
  /** SerpApi credits consumed for this city. */
  searchesUsed: number;
  /** The queries actually sent (short if the budget cut the run short). */
  keywords?: string[];
  /** Results dropped for sitting outside the city radius. */
  outOfRadius?: number;
  error?: string;
}

export interface SyncReport {
  timestamp: string;
  totalCities: number;
  totalClinics: number;
  searchesUsed: number;
  /** Results dropped for sitting outside the city radius. */
  outOfRadius?: number;
  /** Monthly quota the run was allowed to spend. */
  searchBudget: number;
  searchesRemaining: number;
  details: SyncCityResult[];
}

// Re-exported so the Next.js layer and the Node scripts share one implementation.
export {
  MONTHLY_SEARCH_BUDGET,
  SearchBudget,
  SearchBudgetExceededError,
  buildCityQueries,
  PRIMARY_DENTAL_KEYWORDS,
  DENTAL_KEYWORD_GROUPS,
  DENTAL_KEYWORD_LABELS,
  DEFAULT_ZOOM,
  MAX_CITY_RADIUS_KM,
  getSerpApiAccountInfo,
  inferSpecialties,
  isSameClinicAs,
  mapSerpApiPlaceToClinic,
  normalizeMoroccanPhone,
  parseOperatingHours,
  parseRating,
  parseReviewCount,
  resolveNameAr,
  sanitizeKeywords,
  searchPlaces,
  slugify,
};
export { DENTAL_KEYWORDS, HOURLY_SEARCH_LIMIT } from "@/lib/services/serpapi-core.mjs";

/**
 * Fetch clinics for a single city with one search (1 SerpApi credit).
 */
export async function fetchClinicsForCity(
  citySlug: string,
  apiKey?: string,
  options?: { query?: string; zoom?: number },
): Promise<SyncCityResult> {
  const key = apiKey || process.env.SERPAPI_API_KEY;
  const city = getCity(citySlug);

  if (!city) {
    return {
      citySlug,
      cityName: citySlug,
      fetched: 0,
      clinics: [],
      searchesUsed: 0,
      error: `City with slug '${citySlug}' not found in configuration.`,
    };
  }

  if (!key) {
    return {
      citySlug,
      cityName: city.name,
      fetched: 0,
      clinics: [],
      searchesUsed: 0,
      error: "SERPAPI_API_KEY is not defined. Set it in your environment variables.",
    };
  }

  const query = options?.query ?? buildCityQueries(city)[0];

  try {
    const { places, error } = await searchPlaces(city, query, key, options?.zoom);

    if (error) {
      return { citySlug, cityName: city.name, fetched: 0, clinics: [], searchesUsed: 1, error };
    }

    const clinics = places.map(
      (place: SerpApiPlace) => mapSerpApiPlaceToClinic(place, city) as unknown as Clinic,
    );

    return {
      citySlug,
      cityName: city.name,
      fetched: clinics.length,
      clinics,
      searchesUsed: 1,
      keywords: [query],
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      citySlug,
      cityName: city.name,
      fetched: 0,
      clinics: [],
      searchesUsed: 1,
      error: `Failed to fetch from SerpApi: ${msg}`,
    };
  }
}

/**
 * Sync one city across every dental keyword, deduplicating overlap.
 */
export async function syncCityWithKeywords(
  citySlug: string,
  apiKey?: string,
  options?: {
    budget?: SearchBudget;
    keywords?: string[];
    delayMs?: number;
    zoom?: number;
  },
): Promise<SyncCityResult> {
  const key = apiKey || process.env.SERPAPI_API_KEY;
  const city = getCity(citySlug);

  if (!city) {
    return {
      citySlug,
      cityName: citySlug,
      fetched: 0,
      clinics: [],
      searchesUsed: 0,
      error: `City with slug '${citySlug}' not found in configuration.`,
    };
  }

  if (!key) {
    return {
      citySlug,
      cityName: city.name,
      fetched: 0,
      clinics: [],
      searchesUsed: 0,
      error: "SERPAPI_API_KEY is not defined. Set it in your environment variables.",
    };
  }

  return (await syncCityCore(city, key, options)) as SyncCityResult;
}

/**
 * Batch sync clinics across Moroccan cities. Every search is charged against a
 * shared monthly budget so the run cannot exceed SerpApi's free tier.
 */
export async function syncAllCities(options?: {
  apiKey?: string;
  delayMs?: number;
  cityFilter?: string[];
  keywords?: string[];
  budget?: SearchBudget;
  maxSearches?: number;
}): Promise<SyncReport> {
  const key = options?.apiKey || process.env.SERPAPI_API_KEY;
  const targetCities: City[] = options?.cityFilter
    ? cities.filter((c) => options.cityFilter?.includes(c.slug))
    : cities;

  const defaultMax = targetCities.length > 1 ? 15 : 7;
  const configuredMax = Number(
    process.env.SERPAPI_MAX_SEARCHES ?? process.env.SERAPI_MAX_SEARCHES ?? defaultMax,
  );
  const searchLimit = options?.maxSearches ?? configuredMax;
  const budget =
    options?.budget ?? new SearchBudget(Math.min(searchLimit, MONTHLY_SEARCH_BUDGET));

  return (await syncAllCitiesCore(targetCities, key ?? "", {
    budget,
    ...(options?.keywords ? { keywords: options.keywords } : {}),
    ...(options?.delayMs !== undefined ? { delayMs: options.delayMs } : {}),
  })) as SyncReport;
}

/**
 * Upsert synced clinics into PostgreSQL via Prisma
 */
export async function upsertClinicsToDatabase(clinics: Clinic[]): Promise<{ count: number }> {
  if (!process.env.DATABASE_URL) return { count: 0 };
  let count = 0;
  for (const clinic of clinics) {
    try {
      // `lastSyncedAt` is a timestamptz mapped to the temporal codec, which
      // encodes `Temporal.Instant` and rejects a JavaScript `Date`.
      const lastSyncedAt = toInstant(clinic.lastSyncedAt || new Date().toISOString());
      const hours = toJson(clinic.hours);

      // Match in descending order of confidence: the Google place id, then the
      // exact slug, then the name — where the name match only counts when a
      // phone or address confirms it is the same practice.
      //
      // Once a clinic acquires a real Google place_id, no other keyword run may
      // attach its results to a different row: we must look it up globally by
      // place_id first. That re-homes the case where an earlier keyword matched
      // the row by slug/fuzzy match before the place_id was known.
      let existing = null;
      if (clinic.googlePlaceId) {
        existing = await prisma.orm.public.Clinic.where({ googlePlaceId: clinic.googlePlaceId }).first();
      }
      if (!existing) {
        existing = await prisma.orm.public.Clinic.where({ slug: clinic.slug }).first();
      }
      if (!existing) {
        const candidates = await prisma.orm.public.Clinic.where({ name: clinic.name, citySlug: clinic.citySlug }).all();
        existing = candidates.find((row) => isSameClinicAs(clinic, row)) ?? null;
      }

      const slugToUse = existing?.slug || clinic.slug;

      const upserted = await prisma.orm.public.Clinic.upsert({
        conflictOn: { slug: slugToUse },
        update: {
          googlePlaceId: clinic.googlePlaceId ?? existing?.googlePlaceId ?? null,
          name: clinic.name,
          nameAr: resolveNameAr(clinic.name, clinic.nameAr, existing?.nameAr),
          citySlug: clinic.citySlug,
          neighborhoodFr: clinic.neighborhood.fr,
          neighborhoodAr: clinic.neighborhood.ar,
          addressFr: clinic.address.fr,
          addressAr: clinic.address.ar,
          phone: clinic.phone ?? existing?.phone,
          phoneHref: clinic.phoneHref ?? existing?.phoneHref,
          whatsapp: clinic.whatsapp ?? existing?.whatsapp,
          website: clinic.website ?? existing?.website,
          rating: clinic.rating ?? existing?.rating ?? null,
          reviewCount: Math.max(
            Number(existing?.reviewCount ?? 0),
            Number(clinic.reviewCount ?? 0),
          ),
          verified: clinic.verified || Boolean(existing?.verified),
          descriptionFr: clinic.description.fr,
          descriptionAr: clinic.description.ar,
          lat: clinic.lat,
          lng: clinic.lng,
          hours,
          lastSyncedAt,
        },
        create: {
          slug: slugToUse,
          googlePlaceId: clinic.googlePlaceId,
          name: clinic.name,
          nameAr: clinic.nameAr,
          citySlug: clinic.citySlug,
          neighborhoodFr: clinic.neighborhood.fr,
          neighborhoodAr: clinic.neighborhood.ar,
          addressFr: clinic.address.fr,
          addressAr: clinic.address.ar,
          phone: clinic.phone,
          phoneHref: clinic.phoneHref,
          whatsapp: clinic.whatsapp,
          website: clinic.website,
          rating: clinic.rating,
          reviewCount: clinic.reviewCount,
          verified: clinic.verified,
          claimed: false,
          usesApp: false,
          descriptionFr: clinic.description.fr,
          descriptionAr: clinic.description.ar,
          lat: clinic.lat,
          lng: clinic.lng,
          hours,
          lastSyncedAt,
        },
      });

      for (const specSlug of clinic.specialtySlugs) {
        const spec = await prisma.orm.public.Specialty.where({ slug: specSlug }).first();
        if (spec) {
          await prisma.orm.public.ClinicSpecialty.upsert({
            conflictOn: {
              clinicId: upserted.id,
              specialtyId: spec.id,
            },
            update: {},
            create: {
              clinicId: upserted.id,
              specialtyId: spec.id,
            },
          });
        }
      }
      count++;
    } catch (e) {
      console.error(`[DB] Failed to upsert clinic ${clinic.slug}:`, e);
    }
  }
  return { count };
}